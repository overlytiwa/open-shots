import { useState } from 'react'
import {
  Camera,
  ImagePlus,
  Upload,
  Check,
  Search,
  Plus,
  Copy,
  Trash2,
  FlipHorizontal,
  FlipVertical,
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Shuffle,
  RotateCcw,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  AppWindow,
  Watch,
  Image,
  Code2,
} from 'lucide-react'
import type { Project, Layer, Device, FrameStyle } from '../core/model'
import {
  backgrounds,
  devices,
  deviceModels,
  motions,
  sizes,
  templates,
  uid,
  layer,
  applyTemplate,
} from '../core/model'
import { media, palette } from '../core/renderer'
import { Section, Range, Color, Select, Toggle, NumberField } from './Controls'
export type Panel =
  | 'templates'
  | 'mockup'
  | 'background'
  | 'layout'
  | 'style'
  | 'text'
  | 'effects'
  | 'motion'
  | 'brand'
export const panelNames: Record<Panel, string> = {
  templates: 'Templates',
  mockup: 'Mockup',
  background: 'Background',
  layout: 'Layout',
  style: 'Style',
  text: 'Text & shapes',
  effects: 'Effects',
  motion: 'Animation',
  brand: 'Watermark',
}
export function Inspector({
  panel,
  p,
  selected,
  setSelected,
  change,
  update,
  upload,
  time,
  notify,
}: {
  panel: Panel
  p: Project
  selected: string
  setSelected: (id: string) => void
  change: (fn: (p: Project) => Project) => void
  update: (v: Partial<Layer>) => void
  upload: (target?: string) => void
  time: number
  notify: (s: string) => void
}) {
  const l = p.layers.find((l) => l.id === selected),
    [bgTab, setBgTab] = useState('Presets'),
    [photoQuery, setPhotoQuery] = useState(''),
    [photos, setPhotos] = useState<
      { url: string; thumb: string; credit: string; link: string; download: string }[]
    >([]),
    [searching, setSearching] = useState(false)
  const bg = (v: Partial<Project['background']>) =>
      change((p) => ({ ...p, background: { ...p.background, ...v } })),
    anim = (v: Partial<Project['animation']>) =>
      change((p) => ({ ...p, animation: { ...p.animation, ...v } })),
    wm = (v: Partial<Project['watermark']>) =>
      change((p) => ({ ...p, watermark: { ...p.watermark, ...v } }))
  const add = (v: Partial<Layer>) => {
    const a = layer({ src: '', device: 'none', shadow: 0, ...v })
    change((p) => ({ ...p, layers: [...p.layers, a] }))
    setSelected(a.id)
  }
  const pickPhoto = async (photo: (typeof photos)[number]) => {
    try {
      notify('Loading photo…')
      const r = await fetch(photo.url)
      if (!r.ok) throw Error('Photo could not be loaded')
      const blob = await r.blob()
      const src = await new Promise<string>((res, rej) => {
        const f = new FileReader()
        f.onload = () => res(String(f.result))
        f.onerror = () => rej(f.error)
        f.readAsDataURL(blob)
      })
      bg({ src, type: 'image' })
      if (photo.download)
        void fetch(`/api/photos?download=${encodeURIComponent(photo.download)}`).catch(() => {})
      notify('Background added')
    } catch (e) {
      notify((e as Error).message)
    }
  }
  const findPhotos = async () => {
    setSearching(true)
    try {
      if (window.openshot)
        throw Error('Use photo search in the web app, or upload a background image')
      const r = await fetch(`/api/photos?query=${encodeURIComponent(photoQuery || 'nature')}`)
      if (!r.headers.get('content-type')?.includes('application/json'))
        throw Error('Photo search needs an Unsplash API key on the server')
      const data = await r.json()
      if (!r.ok) throw Error(data.error || 'Photo search is unavailable')
      setPhotos(data.photos)
      if (!data.photos.length) notify('No photos found')
    } catch (e) {
      notify(
        (e as Error).message === 'Unexpected token \'<\', "<!doctype "... is not valid JSON'
          ? 'Photo search needs an Unsplash API key on the server'
          : (e as Error).message,
      )
    } finally {
      setSearching(false)
    }
  }
  if (panel === 'templates')
    return (
      <>
        <p className="panel-note">
          A starting point for your screenshot. Everything stays editable.
        </p>
        <div className="template-grid">
          {templates.map((t, i) => (
            <button
              key={t.name}
              className="template-card"
              onClick={() => {
                change((p) => applyTemplate(p, i))
                setSelected('')
              }}
            >
              <div
                className={'template-preview template-' + t.layout}
                style={{
                  background: `linear-gradient(140deg,${backgrounds[t.bg].colors.join(',')})`,
                }}
              >
                <div
                  className={'mini-device ' + t.device}
                  style={{ transform: `rotate(${t.rotate}deg)` }}
                >
                  <img src="./sample.svg" alt="" />
                </div>
                {['duo', 'trio'].includes(t.layout) && (
                  <div className={'mini-device second ' + t.device}>
                    <img src="./sample.svg" alt="" />
                  </div>
                )}
                {t.layout === 'caption' && <span>Project notes</span>}
              </div>
              <strong>{t.name}</strong>
              <small>{t.description}</small>
            </button>
          ))}
        </div>
      </>
    )
  if (panel === 'background')
    return (
      <>
        <div className="segmented">
          {['Presets', 'Custom', 'Photos'].map((v) => (
            <button className={bgTab === v ? 'active' : ''} key={v} onClick={() => setBgTab(v)}>
              {v}
            </button>
          ))}
        </div>
        {bgTab === 'Presets' ? (
          <>
            <Section title="Gradients">
              <div className="swatch-grid">
                {backgrounds.map((b) => (
                  <button
                    key={b.name}
                    title={b.name}
                    aria-label={b.name + ' gradient'}
                    className={
                      'bg-swatch ' +
                      (p.background.colors.join() === b.colors.join() ? 'selected' : '')
                    }
                    style={{ background: `linear-gradient(135deg,${b.colors.join(',')})` }}
                    onClick={() => bg({ type: 'gradient', colors: b.colors })}
                  >
                    {p.background.colors.join() === b.colors.join() && <Check size={18} />}
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Media colors">
              <button
                className="wide-button"
                onClick={() => {
                  const s = p.layers.find((l) => l.kind === 'media'),
                    m = s && media.cache.get(s.src)
                  if (m) bg({ type: 'gradient', colors: palette(m) })
                  else notify('Add an image first')
                }}
              >
                <Shuffle size={16} /> Match screenshot colors
              </button>
              <div className="two-columns">
                <button
                  className={'choice ' + (p.background.type === 'magic' ? 'selected' : '')}
                  onClick={() => bg({ type: 'magic' })}
                >
                  Blurred media
                </button>
                <button
                  className={'choice ' + (p.background.type === 'mesh' ? 'selected' : '')}
                  onClick={() => bg({ type: 'mesh' })}
                >
                  Live mesh
                </button>
              </div>
            </Section>
            <Section title="Solid colors">
              <div className="solid-colors">
                {[
                  '#ffffff',
                  '#e5e7eb',
                  '#151719',
                  '#000000',
                  '#c4b5fd',
                  '#b9f18c',
                  '#fab6c4',
                  '#8dd4f3',
                ].map((color) => (
                  <button
                    key={color}
                    aria-label={'Background ' + color}
                    style={{ background: color }}
                    onClick={() => bg({ type: 'solid', colors: [color] })}
                  />
                ))}
              </div>
              <button
                className={
                  'wide-button transparent ' +
                  (p.background.type === 'transparent' ? 'selected' : '')
                }
                onClick={() => bg({ type: 'transparent' })}
              >
                Transparent
              </button>
            </Section>
          </>
        ) : bgTab === 'Custom' ? (
          <>
            <Section title="Background type">
              <Select
                label="Fill"
                value={p.background.type}
                options={['gradient', 'solid', 'image', 'transparent', 'magic', 'mesh']}
                onChange={(v) => bg({ type: v as Project['background']['type'] })}
              />
              {!['image', 'transparent', 'magic'].includes(p.background.type) &&
                p.background.colors.map((color, i) => (
                  <Color
                    key={i}
                    label={'Color ' + (i + 1)}
                    value={color}
                    onChange={(v) =>
                      bg({ colors: p.background.colors.map((c, j) => (j === i ? v : c)) })
                    }
                  />
                ))}
              <Range
                label="Angle"
                value={p.background.angle}
                max={360}
                suffix="°"
                onChange={(v) => bg({ angle: v })}
              />
              <button className="wide-button" onClick={() => upload('background')}>
                <ImagePlus size={16} /> Upload background
              </button>
            </Section>
            <Section title="Texture">
              <Select
                label="Pattern"
                value={p.background.pattern}
                options={['none', 'grid', 'dots', 'lines']}
                onChange={(v) => bg({ pattern: v as Project['background']['pattern'] })}
              />
              <Range
                label="Grain"
                value={p.background.noise}
                max={50}
                suffix="%"
                onChange={(v) => bg({ noise: v })}
              />
              <Range
                label="Background blur"
                value={p.background.blur}
                max={100}
                suffix="px"
                onChange={(v) => bg({ blur: v })}
              />
            </Section>
          </>
        ) : (
          <Section title="Unsplash">
            <p className="panel-note">
              Search photos from Unsplash. Upload a photo to use your own.
            </p>
            <form
              className="search-field"
              onSubmit={(e) => {
                e.preventDefault()
                void findPhotos()
              }}
            >
              <input
                aria-label="Search photos"
                placeholder="Mountains, architecture…"
                value={photoQuery}
                onChange={(e) => setPhotoQuery(e.target.value)}
              />
              <button aria-label="Search" disabled={searching}>
                <Search size={16} />
              </button>
            </form>
            <div className="photo-grid">
              {photos.map((photo, i) => (
                <div key={i}>
                  <button onClick={() => void pickPhoto(photo)}>
                    <img src={photo.thumb} alt={photo.credit} />
                  </button>
                  <a href={photo.link} target="_blank" rel="noreferrer">
                    {photo.credit}
                  </a>
                </div>
              ))}
            </div>
            <button className="wide-button" onClick={() => upload('background')}>
              <Upload size={16} /> Upload photo
            </button>
          </Section>
        )}
        <Section title="Shadow overlays">
          <div className="two-columns">
            {['none', 'window', 'leaves', 'diagonal'].map((o) => (
              <button
                key={o}
                className={'choice ' + (p.background.overlay === o ? 'selected' : '')}
                onClick={() => bg({ overlay: o as Project['background']['overlay'] })}
              >
                {o === 'none' ? 'None' : o[0].toUpperCase() + o.slice(1)}
              </button>
            ))}
          </div>
          {p.background.overlay !== 'none' && (
            <Range
              label="Overlay opacity"
              value={p.background.overlayOpacity}
              max={70}
              suffix="%"
              onChange={(v) => bg({ overlayOpacity: v })}
            />
          )}
        </Section>
      </>
    )
  if (panel === 'layout')
    return (
      <>
        <Section title="Canvas size">
          <Select
            label="Preset"
            value={
              sizes.find((s) => s.width === p.width && s.height === p.height)?.name || 'Custom'
            }
            options={[...sizes.map((s) => s.name), 'Custom']}
            onChange={(v) => {
              const s = sizes.find((s) => s.name === v)
              if (s) change((p) => ({ ...p, width: s.width, height: s.height }))
            }}
          />
          <div className="two-columns">
            <NumberField
              label="Width"
              value={p.width}
              min={64}
              max={8192}
              onChange={(v) => change((p) => ({ ...p, width: v }))}
            />
            <NumberField
              label="Height"
              value={p.height}
              min={64}
              max={8192}
              onChange={(v) => change((p) => ({ ...p, height: v }))}
            />
          </div>
          <button
            className="wide-button"
            onClick={() => change((p) => ({ ...p, width: p.height, height: p.width }))}
          >
            <RotateCcw size={15} /> Swap dimensions
          </button>
        </Section>
        <Section title="Arrange">
          <div className="two-columns">
            {['Single', 'Side by side', 'Stacked', 'Grid'].map((name, i) => (
              <button
                className="layout-choice"
                key={name}
                onClick={() => {
                  change((p) => {
                    const source = p.layers.find((l) => l.kind === 'media') || layer(),
                      count = [1, 2, 2, 4][i]
                    return {
                      ...p,
                      layers: Array.from({ length: count }, (_, n) => ({
                        ...source,
                        id: uid(),
                        x: i === 0 || i === 2 ? 50 : 27 + (n % 2) * 46,
                        y: i === 2 ? 27 + n * 46 : i === 3 ? 28 + Math.floor(n / 2) * 44 : 50,
                        width: i === 0 ? 78 : i === 2 ? 65 : 42,
                        height: i === 0 ? 69 : i === 1 ? 68 : 38,
                        rotate: 0,
                        rotateX: 0,
                        rotateY: 0,
                      })),
                    }
                  })
                  setSelected('')
                }}
              >
                <span className={'layout-icon layout-' + i}>
                  {Array.from({ length: [1, 2, 2, 4][i] }, (_, n) => (
                    <i key={n} />
                  ))}
                </span>
                {name}
              </button>
            ))}
          </div>
          <p className="panel-note">
            Layouts repeat the selected media. Replace each screen with another image or video.
          </p>
        </Section>
        {l && (
          <Section title="Position">
            <div className="two-columns">
              <NumberField
                label="X (%)"
                value={l.x}
                min={-100}
                max={200}
                onChange={(v) => update({ x: v })}
              />
              <NumberField
                label="Y (%)"
                value={l.y}
                min={-100}
                max={200}
                onChange={(v) => update({ y: v })}
              />
            </div>
            <div className="two-columns">
              <NumberField
                label="Layer width (%)"
                value={l.width}
                min={1}
                max={200}
                onChange={(v) => update({ width: v })}
              />
              <NumberField
                label="Layer height (%)"
                value={l.height}
                min={1}
                max={200}
                onChange={(v) => update({ height: v })}
              />
            </div>
            <div className="button-row">
              <button title="Center horizontally" onClick={() => update({ x: 50 })}>
                <AlignHorizontalJustifyCenter size={17} />
              </button>
              <button title="Center vertically" onClick={() => update({ y: 50 })}>
                <AlignVerticalJustifyCenter size={17} />
              </button>
              <button title="Center both" onClick={() => update({ x: 50, y: 50 })}>
                <AlignCenter size={17} />
              </button>
            </div>
          </Section>
        )}
      </>
    )
  if (panel === 'brand')
    return (
      <>
        <Section title="Custom watermark">
          <p className="panel-note">Add your own name or logo. OpenShot never adds a watermark.</p>
          <label className="field">
            <span>Watermark text</span>
            <input
              placeholder="Your name or website"
              value={p.watermark.text}
              onChange={(e) => wm({ text: e.target.value })}
            />
          </label>
          <button className="wide-button" onClick={() => upload('watermark')}>
            <ImagePlus size={16} /> Upload logo
          </button>
          {p.watermark.src && (
            <button className="wide-button" onClick={() => wm({ src: '' })}>
              <Trash2 size={16} /> Remove logo
            </button>
          )}
          <Select
            label="Position"
            value={p.watermark.position}
            options={['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center']}
            onChange={(v) => wm({ position: v as Project['watermark']['position'] })}
          />
          <Range
            label="Watermark opacity"
            value={p.watermark.opacity * 100}
            suffix="%"
            onChange={(v) => wm({ opacity: v / 100 })}
          />
          <Range
            label="Watermark size"
            value={p.watermark.size}
            min={8}
            max={120}
            suffix="px"
            onChange={(v) => wm({ size: v })}
          />
        </Section>
      </>
    )
  if (panel === 'text')
    return (
      <>
        <Section title="Add a layer">
          <button
            className="wide-button"
            onClick={() =>
              add({
                kind: 'text',
                name: 'Text',
                text: 'Add your text',
                width: 75,
                height: 20,
                y: 20,
                fontSize: 54,
              })
            }
          >
            <Plus size={16} /> Add text
          </button>
          <button
            className="wide-button"
            onClick={() =>
              add({
                kind: 'code',
                name: 'Code',
                text: "const screenshot = await openShot()\n\nexport function share(project) {\n  return project.export('png')\n}",
                width: 65,
                height: 55,
                fontSize: 23,
                frameColor: '#1c202b',
              })
            }
          >
            <Code2 size={16} /> Add code
          </button>
        </Section>
        <Section title="Shapes">
          <div className="two-columns">
            {['sphere', 'cube', 'ring', 'circle', 'rectangle', 'arch'].map((shape) => (
              <button
                key={shape}
                className="choice"
                onClick={() =>
                  add({
                    kind: 'shape',
                    name: shape[0].toUpperCase() + shape.slice(1),
                    shape: shape as Layer['shape'],
                    width: 22,
                    height: 30,
                    color: '#d9c8ff',
                    x: 72,
                    y: 65,
                  })
                }
              >
                {shape[0].toUpperCase() + shape.slice(1)}
              </button>
            ))}
          </div>
        </Section>
        {l && ['text', 'code'].includes(l.kind) && (
          <Section title={l.kind === 'code' ? 'Code' : 'Text'}>
            <label className="field">
              <span>Content</span>
              <textarea
                aria-label="Text content"
                rows={5}
                value={l.text}
                onChange={(e) => update({ text: e.target.value })}
              />
            </label>
            <Range
              label="Font size"
              value={l.fontSize}
              min={10}
              max={200}
              suffix="px"
              onChange={(v) => update({ fontSize: v })}
            />
            <Select
              label="Font"
              value={l.fontFamily}
              options={[
                { value: 'Inter, Arial, sans-serif', label: 'Sans serif' },
                { value: 'Georgia, serif', label: 'Serif' },
                { value: 'monospace', label: 'Monospace' },
                { value: 'Arial Black, sans-serif', label: 'Heavy sans' },
                { value: 'system-ui', label: 'System' },
                { value: 'Trebuchet MS, sans-serif', label: 'Humanist' },
              ]}
              onChange={(v) => update({ fontFamily: v })}
            />
            <Color label="Text color" value={l.color} onChange={(v) => update({ color: v })} />
            <Select
              label="Alignment"
              value={l.align}
              options={['left', 'center', 'right']}
              onChange={(v) => update({ align: v as Layer['align'] })}
            />
            <Toggle label="Bold" value={l.bold} onChange={(v) => update({ bold: v })} />
          </Section>
        )}
        {l?.kind === 'shape' && (
          <Section title="Shape">
            <Color label="Shape color" value={l.color} onChange={(v) => update({ color: v })} />
            <Range
              label="Shape radius"
              value={l.radius}
              max={150}
              onChange={(v) => update({ radius: v })}
            />
          </Section>
        )}
      </>
    )
  if (!l)
    return (
      <div className="empty-panel">
        <Camera size={26} />
        <p>Select a layer to edit it</p>
        <button className="wide-button" onClick={() => upload()}>
          Add an image
        </button>
      </div>
    )
  if (panel === 'mockup')
    return (
      <>
        <button className="upload-tile" onClick={() => upload(l.id)}>
          <ImagePlus size={22} />
          <strong>Replace media</strong>
          <span>Image or video</span>
        </button>
        <Section title="Frame">
          <div className="device-grid">
            {devices.map((d) => {
              const Icon = ['iphone', 'android'].includes(d.id)
                ? Smartphone
                : d.id === 'tablet'
                  ? Tablet
                  : d.id === 'laptop'
                    ? Laptop
                    : d.id === 'desktop'
                      ? Monitor
                      : d.id === 'watch'
                        ? Watch
                        : d.id === 'none'
                          ? Image
                          : AppWindow
              return (
                <button
                  key={d.id}
                  aria-label={d.name + ' frame'}
                  className={'device-choice ' + (l.device === d.id ? 'selected' : '')}
                  onClick={() => {
                    const height = ['iphone', 'android', 'tablet', 'watch'].includes(d.id) ? 76 : 69
                    update({
                      device: d.id,
                      model: deviceModels[d.id]?.[0]?.name || '',
                      landscape: false,
                      width: Math.min(84, ((height * p.height) / p.width) * d.ratio),
                      height,
                    })
                  }}
                >
                  <Icon size={25} strokeWidth={1.5} />
                  <span>{d.name}</span>
                </button>
              )
            })}
          </div>
          {deviceModels[l.device] && (
            <>
              <Select
                label="Model"
                value={l.model || deviceModels[l.device]![0].name}
                options={deviceModels[l.device]!.map((m) => m.name)}
                onChange={(name) => {
                  const m = deviceModels[l.device]!.find((m) => m.name === name)!
                  update({
                    model: name,
                    landscape: false,
                    height: 76,
                    width: Math.min(84, ((76 * p.height) / p.width) * m.ratio),
                  })
                }}
              />
              <Toggle
                label="Landscape"
                value={l.landscape}
                onChange={(v) =>
                  update({
                    landscape: v,
                    width: (l.height * p.height) / p.width,
                    height: (l.width * p.width) / p.height,
                  })
                }
              />
            </>
          )}
          <label className="field">
            <span>Layer name</span>
            <input value={l.name} onChange={(e) => update({ name: e.target.value })} />
          </label>
        </Section>
        <Section title="Screen">
          <Select
            label="Image fitting"
            value={l.fit}
            options={['cover', 'contain']}
            onChange={(v) => update({ fit: v as Layer['fit'] })}
          />
          <Range
            label="Screen zoom"
            value={l.zoom * 100}
            min={50}
            max={300}
            suffix="%"
            onChange={(v) => update({ zoom: v / 100 })}
          />
          <Range label="Crop horizontal" value={l.cropX} onChange={(v) => update({ cropX: v })} />
          <Range label="Crop vertical" value={l.cropY} onChange={(v) => update({ cropY: v })} />
          <div className="two-columns">
            <button
              className={'wide-button ' + (l.flipX ? 'selected' : '')}
              onClick={() => update({ flipX: !l.flipX })}
            >
              <FlipHorizontal size={16} /> Flip X
            </button>
            <button
              className={'wide-button ' + (l.flipY ? 'selected' : '')}
              onClick={() => update({ flipY: !l.flipY })}
            >
              <FlipVertical size={16} /> Flip Y
            </button>
          </div>
          {['browser', 'safari'].includes(l.device) && (
            <label className="field">
              <span>Address label</span>
              <input value={l.url} onChange={(e) => update({ url: e.target.value })} />
            </label>
          )}
          <Toggle label="Visible" value={!l.hidden} onChange={(v) => update({ hidden: !v })} />
        </Section>
        {l.mediaType === 'video' && (
          <Section title="Video">
            <div className="two-columns">
              <NumberField
                label="Trim start (s)"
                value={l.trimStart}
                min={0}
                max={l.trimEnd - 0.01}
                onChange={(v) => update({ trimStart: v })}
              />
              <NumberField
                label="Trim end (s)"
                value={l.trimEnd}
                min={l.trimStart + 0.01}
                onChange={(v) => update({ trimEnd: v })}
              />
            </div>
            <Range
              label="Playback speed"
              value={l.speed}
              min={0.25}
              max={3}
              step={0.25}
              suffix="×"
              onChange={(v) => update({ speed: v })}
            />
          </Section>
        )}
      </>
    )
  if (panel === 'style')
    return (
      <>
        <Section title="Frame style">
          <div className="two-columns">
            {[
              ['default', 'Default'],
              ['glass-light', 'Glass light'],
              ['glass-dark', 'Glass dark'],
              ['liquid', 'Liquid glass'],
              ['inset-light', 'Inset light'],
              ['inset-dark', 'Inset dark'],
              ['outline', 'Outline'],
              ['border', 'Border'],
            ].map(([id, name]) => (
              <button
                key={id}
                className={'style-choice ' + (l.style === id ? 'selected' : '')}
                onClick={() => update({ style: id as FrameStyle })}
              >
                <span className={'style-preview ' + id} />
                {name}
              </button>
            ))}
          </div>
          <Color
            label="Frame color"
            value={l.frameColor}
            onChange={(v) => update({ frameColor: v })}
          />
          <Range
            label="Corner radius"
            value={l.radius}
            max={100}
            suffix="px"
            onChange={(v) => update({ radius: v })}
          />
          <Range
            label="Frame padding"
            value={l.padding}
            max={60}
            suffix="px"
            onChange={(v) => update({ padding: v })}
          />
        </Section>
        <Section title="Shadow">
          <Select
            label="Shadow type"
            value={l.shadowType}
            options={['none', 'spread', 'hug', 'adaptive']}
            onChange={(v) => update({ shadowType: v as Layer['shadowType'] })}
          />
          <Range
            label="Shadow opacity"
            value={l.shadow}
            suffix="%"
            onChange={(v) => update({ shadow: v })}
          />
          <Range
            label="Light direction"
            value={l.shadowAngle}
            max={360}
            suffix="°"
            onChange={(v) => update({ shadowAngle: v })}
          />
          <Color
            label="Shadow color"
            value={l.shadowColor}
            onChange={(v) => update({ shadowColor: v })}
          />
          <Range
            label="Reflection"
            value={l.reflection}
            max={70}
            suffix="%"
            onChange={(v) => update({ reflection: v })}
          />
        </Section>
      </>
    )
  if (panel === 'effects')
    return (
      <>
        <Section title="Perspective">
          <Range
            label="Rotate"
            value={l.rotate}
            min={-180}
            max={180}
            suffix="°"
            onChange={(v) => update({ rotate: v })}
          />
          <Range
            label="Tilt X"
            value={l.rotateX}
            min={-70}
            max={70}
            suffix="°"
            onChange={(v) => update({ rotateX: v })}
          />
          <Range
            label="Tilt Y"
            value={l.rotateY}
            min={-70}
            max={70}
            suffix="°"
            onChange={(v) => update({ rotateY: v })}
          />
          <Range
            label="Scale"
            value={l.scale * 100}
            min={10}
            max={200}
            suffix="%"
            onChange={(v) => update({ scale: v / 100 })}
          />
          <Range
            label="Opacity"
            value={l.opacity * 100}
            suffix="%"
            onChange={(v) => update({ opacity: v / 100 })}
          />
        </Section>
        <Section title="Filters">
          <div className="filter-grid">
            {['none', 'mono', 'warm', 'cool', 'vintage', 'vhs', 'glitch'].map((f) => (
              <button
                className={'filter-choice ' + (l.filter === f ? 'selected' : '')}
                key={f}
                onClick={() => update({ filter: f as Layer['filter'] })}
              >
                <div className={'filter-thumbnail ' + f}>
                  <img src="./sample.svg" alt="" />
                </div>
                <span>{f === 'vhs' ? 'VHS' : f[0].toUpperCase() + f.slice(1)}</span>
              </button>
            ))}
          </div>
          <Range
            label="Brightness"
            value={l.brightness}
            max={200}
            suffix="%"
            onChange={(v) => update({ brightness: v })}
          />
          <Range
            label="Contrast"
            value={l.contrast}
            max={200}
            suffix="%"
            onChange={(v) => update({ contrast: v })}
          />
          <Range
            label="Saturation"
            value={l.saturation}
            max={200}
            suffix="%"
            onChange={(v) => update({ saturation: v })}
          />
          <Range
            label="Media blur"
            value={l.blur}
            max={30}
            suffix="px"
            onChange={(v) => update({ blur: v })}
          />
        </Section>
      </>
    )
  if (panel === 'motion')
    return (
      <>
        <Section title="Playback">
          <Range
            label="Duration"
            value={p.animation.duration}
            min={1}
            max={30}
            step={0.5}
            suffix="s"
            onChange={(v) => anim({ duration: v })}
          />
          <Select
            label="Easing"
            value={p.animation.easing}
            options={['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring']}
            onChange={(v) => anim({ easing: v as Project['animation']['easing'] })}
          />
          <Select
            label="Frame rate"
            value={String(p.animation.fps)}
            options={['24', '30', '60']}
            onChange={(v) => anim({ fps: +v })}
          />
          <Toggle label="Loop" value={p.animation.loop} onChange={(v) => anim({ loop: v })} />
        </Section>
        <Section title="Motion presets">
          <div className="two-columns">
            {motions.map((m) => (
              <button
                key={m.id}
                className={'choice ' + (l.motion === m.id ? 'selected' : '')}
                onClick={() => update({ motion: m.id, keyframes: [] })}
              >
                {m.name}
              </button>
            ))}
          </div>
        </Section>
        {l.motion === 'focus' && (
          <Section title="Focus zoom">
            <Range
              label="Zoom amount"
              value={p.animation.zoom}
              min={1}
              max={3}
              step={0.05}
              suffix="×"
              onChange={(v) => anim({ zoom: v })}
            />
            <Range
              label="Focus X"
              value={p.animation.focusX}
              onChange={(v) => anim({ focusX: v })}
            />
            <Range
              label="Focus Y"
              value={p.animation.focusY}
              onChange={(v) => anim({ focusY: v })}
            />
          </Section>
        )}
        <Section title="Keyframes">
          <p className="panel-note">
            Set the playhead, adjust position or tilt, then add a keyframe. Keyframes replace the
            motion preset.
          </p>
          <button
            className="wide-button"
            onClick={() => {
              const k = {
                id: uid(),
                time: Math.round(time * 100) / 100,
                x: l.x,
                y: l.y,
                scale: l.scale,
                rotate: l.rotate,
                rotateX: l.rotateX,
                rotateY: l.rotateY,
                opacity: l.opacity,
              }
              update({
                keyframes: [...l.keyframes.filter((f) => Math.abs(f.time - time) > 0.05), k].sort(
                  (a, b) => a.time - b.time,
                ),
              })
            }}
          >
            <Plus size={16} /> Add at {time.toFixed(2)}s
          </button>
          {l.keyframes.map((k) => (
            <div className="keyframe-row" key={k.id}>
              <span>{k.time.toFixed(2)}s</span>
              <span>
                {Math.round(k.scale * 100)}% · {k.rotate}°
              </span>
              <button
                title="Remove keyframe"
                onClick={() => update({ keyframes: l.keyframes.filter((f) => f.id !== k.id) })}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </Section>
      </>
    )
  return null
}
