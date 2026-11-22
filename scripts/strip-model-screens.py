"""Remove unused stock display bitmaps while preserving body materials and geometry.

GLB buffer offsets stay unchanged. Removed image bytes are zeroed, and their
texture/image/buffer-view entries are removed with remaining indices remapped.
"""
import json
from pathlib import Path
import struct
import hashlib

SCREENS = {
    'iphone-17-pro-max': ('screen.001', None),
    'iphone-12-pro': ('Wallpaper', None),
    'galaxy-s21-ultra': ('Screen', None),
    'ipad-mini-6': ('Screen', None),
    'macbook-pro-16': ('sfCQkHOWyrsLmor', None),
    'apple-watch-series-7': (None, 'Object_27'),
    'desktop-monitor': (None, 'screen'),
}

def texture_indices(value):
    result = set()
    if isinstance(value, dict):
        for key, item in value.items():
            if key.endswith('Texture') and isinstance(item, dict) and 'index' in item:
                result.add(item['index'])
            else:
                result.update(texture_indices(item))
    elif isinstance(value, list):
        for item in value:
            result.update(texture_indices(item))
    return result

def walk(value, fn):
    if isinstance(value, dict):
        fn(value)
        for item in list(value.values()):
            walk(item, fn)
    elif isinstance(value, list):
        for item in value:
            walk(item, fn)

def sources(texture):
    found = {texture['source']} if 'source' in texture else set()
    for ext in texture.get('extensions', {}).values():
        if isinstance(ext, dict) and 'source' in ext:
            found.add(ext['source'])
    return found

def strip(path):
    raw = path.read_bytes()
    old_sha = hashlib.sha256(raw).hexdigest()
    json_length = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20+json_length])
    bin_start = 20+json_length+8
    binary = bytearray(raw[bin_start:])
    material_name, node_name = SCREENS[path.stem]
    ids = {i for i, m in enumerate(doc.get('materials', [])) if material_name and m.get('name') == material_name}
    for node in doc.get('nodes', []):
        if node_name and node.get('name') == node_name and 'mesh' in node:
            ids.update(p['material'] for p in doc['meshes'][node['mesh']]['primitives'] if 'material' in p)
    assert ids, path
    removed_textures = set().union(*(texture_indices(doc['materials'][i]) for i in ids))
    other_refs = set().union(*(texture_indices(m) for i, m in enumerate(doc['materials']) if i not in ids))
    assert not removed_textures & other_refs, f'Shared display/body texture in {path}'
    for i in ids:
        def clear_texture(value):
            for key in list(value):
                if key.endswith('Texture'):
                    del value[key]
        walk(doc['materials'][i], clear_texture)
        pbr = doc['materials'][i].setdefault('pbrMetallicRoughness', {})
        pbr['baseColorFactor'] = [0, 0, 0, 1]
        pbr['metallicFactor'] = 0
        pbr['roughnessFactor'] = 1
        doc['materials'][i]['emissiveFactor'] = [0, 0, 0]
    textures = doc.get('textures', [])
    removed_images = set().union(*(sources(textures[i]) for i in removed_textures))
    retained_images = set().union(*(sources(t) for i, t in enumerate(textures) if i not in removed_textures))
    assert not removed_images & retained_images, f'Shared display/body image in {path}'
    texture_map = {old: new for new, old in enumerate(i for i in range(len(textures)) if i not in removed_textures)}
    doc['textures'] = [t for i, t in enumerate(textures) if i not in removed_textures]
    def remap_textures(value):
        for key, item in value.items():
            if key.endswith('Texture') and isinstance(item, dict) and 'index' in item:
                item['index'] = texture_map[item['index']]
    walk(doc.get('materials', []), remap_textures)
    images = doc.get('images', [])
    removed_views = {images[i]['bufferView'] for i in removed_images if 'bufferView' in images[i]}
    wiped = 0
    for i in removed_views:
        view = doc['bufferViews'][i]
        assert view.get('buffer', 0) == 0
        offset, length = view.get('byteOffset', 0), view['byteLength']
        for j, other in enumerate(doc['bufferViews']):
            if j == i or other.get('buffer', 0) != 0:
                continue
            start, end = other.get('byteOffset', 0), other.get('byteOffset', 0)+other['byteLength']
            assert end <= offset or start >= offset+length, f'Overlapping body/display data: {path}'
        binary[offset:offset+length] = bytes(length)
        wiped += length
    image_map = {old: new for new, old in enumerate(i for i in range(len(images)) if i not in removed_images)}
    doc['images'] = [v for i, v in enumerate(images) if i not in removed_images]
    for texture in doc['textures']:
        if 'source' in texture:
            texture['source'] = image_map[texture['source']]
        for ext in texture.get('extensions', {}).values():
            if isinstance(ext, dict) and 'source' in ext:
                ext['source'] = image_map[ext['source']]
    views = doc.get('bufferViews', [])
    view_map = {old: new for new, old in enumerate(i for i in range(len(views)) if i not in removed_views)}
    doc['bufferViews'] = [v for i, v in enumerate(views) if i not in removed_views]
    def remap_views(value):
        if 'bufferView' in value:
            value['bufferView'] = view_map[value['bufferView']]
    walk(doc, remap_views)
    encoded = json.dumps(doc, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    assert len(binary) % 4 == 0
    output = struct.pack('<III', 0x46546C67, 2, 12+8+len(encoded)+8+len(binary))
    output += struct.pack('<II', len(encoded), 0x4E4F534A)+encoded
    output += struct.pack('<II', len(binary), 0x004E4942)+binary
    if not removed_textures:
        output = raw  # A screen with no baked image needs no rewrite.
    path.write_bytes(output)
    return {'file': path.name, 'removed_images': len(removed_images), 'wiped_bytes': wiped, 'before_sha256': old_sha, 'sha256': hashlib.sha256(output).hexdigest(), 'bytes': len(output)}

if __name__ == '__main__':
    base = Path(__file__).resolve().parents[1]
    results = [strip(base/'public/models'/f'{name}.glb') for name in SCREENS]
    (base/'docs/model-screen-cleanup.json').write_text(json.dumps(results, indent=2)+'\n')
    print(json.dumps(results, indent=2))
