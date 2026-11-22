import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { deviceAsset, type DeviceAsset } from './devices'
import type { Layer, Project } from './model'

type Source = HTMLImageElement | HTMLVideoElement
interface Instance {
  root: THREE.Group
  size: THREE.Vector3
  screens: THREE.MeshBasicMaterial[]
  texture: THREE.CanvasTexture
  canvas: HTMLCanvasElement
  bodies: THREE.MeshStandardMaterial[]
  bodyColors: THREE.Color[]
  asset: DeviceAsset
}
class DeviceRenderer {
  private renderer?: THREE.WebGLRenderer
  private scene?: THREE.Scene
  private camera?: THREE.PerspectiveCamera
  private loader?: GLTFLoader
  private models = new Map<string, Promise<THREE.Group>>()
  private instances = new Map<string, Instance>()
  private initialize() {
    if (this.renderer) return
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(1)
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    const scene = new THREE.Scene(),
      pmrem = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    scene.environment = pmrem.fromScene(room, 0.04).texture
    room.dispose()
    pmrem.dispose()
    scene.add(new THREE.HemisphereLight(0xffffff, 0x777b89, 2))
    const key = new THREE.DirectionalLight(0xffffff, 3)
    key.position.set(-500, 800, 1200)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xdde8ff, 1.5)
    fill.position.set(700, 200, 500)
    scene.add(fill)
    this.renderer = renderer
    this.scene = scene
    this.camera = new THREE.PerspectiveCamera()
    const ktx = new KTX2Loader()
      .setTranscoderPath(`${import.meta.env.BASE_URL}basis/`)
      .detectSupport(renderer)
    this.loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx)
  }
  async prepare(layers: Layer[]) {
    const active = new Set(layers.map((l) => l.id))
    for (const [id, instance] of this.instances)
      if (!active.has(id)) {
        instance.texture.dispose()
        instance.screens.forEach((m) => m.dispose())
        this.instances.delete(id)
      }
    await Promise.all(
      layers
        .filter((l) => !l.hidden && !l.displayOnly && l.src && deviceAsset(l))
        .map((l) => this.load(l)),
    )
  }
  private async load(l: Layer) {
    const asset = deviceAsset(l)!
    if (this.instances.get(l.id)?.asset.id === asset.id) return
    this.initialize()
    let promise = this.models.get(asset.id)
    if (!promise) {
      promise = this.loader!.loadAsync(`${import.meta.env.BASE_URL}models/${asset.file}`).then(
        (g) => g.scene,
      )
      this.models.set(asset.id, promise)
      promise.catch(() => this.models.delete(asset.id))
    }
    const original = await promise,
      model = original.clone(true),
      fix = new THREE.Group()
    fix.add(model)
    fix.rotation.set(...asset.rotation)
    fix.updateMatrixWorld(true)
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = Math.round(1024 / asset.ratio)
    if (canvas.height > 2048) {
      canvas.height = 2048
      canvas.width = Math.round(2048 * asset.ratio)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, this.renderer!.capabilities.getMaxAnisotropy())
    const screens: THREE.MeshBasicMaterial[] = [],
      bodies: THREE.MeshStandardMaterial[] = []
    model.traverse((node) => {
      if (asset.hide?.includes(node.name)) {
        node.visible = false
        return
      }
      if (!(node instanceof THREE.Mesh)) return
      const materials = Array.isArray(node.material) ? node.material : [node.material]
      const screen =
        node.name === asset.screenMesh || materials.some((m) => m.name === asset.screenMaterial)
      if (screen) {
        node.geometry = node.geometry.clone()
        const positions = node.geometry.getAttribute('position'),
          points: THREE.Vector3[] = []
        const bounds = new THREE.Box3()
        for (let i = 0; i < positions.count; i++) {
          const v = new THREE.Vector3()
            .fromBufferAttribute(positions, i)
            .applyMatrix4(node.matrixWorld)
          points.push(v)
          bounds.expandByPoint(v)
        }
        const size = bounds.getSize(new THREE.Vector3()),
          uv = new Float32Array(positions.count * 2)
        points.forEach((v, i) => {
          uv[i * 2] = (v.x - bounds.min.x) / Math.max(0.00001, size.x)
          uv[i * 2 + 1] = (v.y - bounds.min.y) / Math.max(0.00001, size.y)
        })
        node.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          toneMapped: false,
          side: THREE.DoubleSide,
        })
        node.material = material
        screens.push(material)
      } else {
        const clones = materials.map((m) => {
          const copy = m.clone()
          if (
            asset.id === 'iphone-17-pro-max' &&
            m.name === 'glass.002' &&
            copy instanceof THREE.MeshStandardMaterial
          ) {
            copy.color.set('#08090a')
            copy.metalness = 0.1
            copy.roughness = 0.25
            if (copy instanceof THREE.MeshPhysicalMaterial) copy.transmission = 0
            copy.transparent = false
            copy.opacity = 1
          }
          if (copy instanceof THREE.MeshStandardMaterial && asset.body?.includes(m.name))
            bodies.push(copy)
          return copy
        })
        node.material = Array.isArray(node.material) ? clones : clones[0]
      }
    })
    if (!screens.length) throw Error(`Could not locate the display in ${asset.name}`)
    const bounds = new THREE.Box3().setFromObject(fix),
      center = bounds.getCenter(new THREE.Vector3()),
      size = bounds.getSize(new THREE.Vector3())
    fix.position.sub(center)
    const root = new THREE.Group()
    root.add(fix)
    this.instances.set(l.id, {
      root,
      size,
      screens,
      texture,
      canvas,
      bodies,
      bodyColors: bodies.map((m) => m.color.clone()),
      asset,
    })
  }
  draw(
    l: Layer,
    p: Project,
    source: Source | undefined,
    density: number,
  ): HTMLCanvasElement | undefined {
    const inst = this.instances.get(l.id)
    if (!inst || !source || inst.asset.id !== deviceAsset(l)?.id) return
    const { renderer, scene, camera } = this
    if (!renderer || !scene || !camera) return
    const width = Math.max(1, Math.round(p.width * density)),
      height = Math.max(1, Math.round(p.height * density))
    if (renderer.domElement.width !== width || renderer.domElement.height !== height)
      renderer.setSize(width, height, false)
    const { canvas, texture } = inst,
      c = canvas.getContext('2d')!,
      sw = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth,
      sh = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight
    c.fillStyle = '#000'
    c.fillRect(0, 0, canvas.width, canvas.height)
    const fit =
        (l.fit === 'contain' ? Math.min : Math.max)(canvas.width / sw, canvas.height / sh) * l.zoom,
      dw = sw * fit,
      dh = sh * fit
    c.save()
    c.filter = `brightness(${l.brightness}%) contrast(${l.contrast}%) saturate(${l.saturation}%) blur(${l.blur}px)${l.filter === 'mono' ? ' grayscale(1)' : ''}`
    c.translate(canvas.width / 2, canvas.height / 2)
    c.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1)
    c.drawImage(
      source,
      -canvas.width / 2 + ((canvas.width - dw) * l.cropX) / 100,
      -canvas.height / 2 + ((canvas.height - dh) * l.cropY) / 100,
      dw,
      dh,
    )
    c.restore()
    texture.needsUpdate = true
    const targetW = (p.width * l.width) / 100,
      targetH = (p.height * l.height) / 100
    const scale =
      Math.min(
        targetW / (l.landscape ? inst.size.y : inst.size.x),
        targetH / (l.landscape ? inst.size.x : inst.size.y),
      ) * l.scale
    inst.root.scale.setScalar(scale)
    inst.root.position.set(((l.x - 50) * p.width) / 100, ((50 - l.y) * p.height) / 100, 0)
    inst.root.rotation.set(
      (-l.rotateX * Math.PI) / 180,
      (-l.rotateY * Math.PI) / 180,
      ((-l.rotate + (l.landscape ? 90 : 0)) * Math.PI) / 180,
      'YXZ',
    )
    inst.bodies.forEach((m, i) =>
      l.finish ? m.color.set(l.finish) : m.color.copy(inst.bodyColors[i]),
    )
    const distance = p.width * 0.9
    camera.fov = (2 * Math.atan(p.height / 2 / distance) * 180) / Math.PI
    camera.aspect = p.width / p.height
    camera.near = 1
    camera.far = distance * 10
    camera.position.set(0, 0, distance)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    scene.add(inst.root)
    renderer.render(scene, camera)
    scene.remove(inst.root)
    return renderer.domElement
  }
}
export const deviceRenderer = new DeviceRenderer()
