import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppWindow,
  Aperture,
  Check,
  ChevronDown,
  EyeOff,
  ImagePlus,
  Info,
  Laptop,
  Monitor,
  MoreHorizontal,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  Tablet,
  Watch,
  X,
  Layers,
  Diamond,
  Trash2,
} from 'lucide-react'
import {
  backgrounds,
  devices,
  layer,
  sizes,
  uid,
  type Device,
  type FrameStyle,
  type Layer,
  type Project,
} from '../core/model'
import { usesFlatDevices } from '../core/device-service'
import { deviceAsset, deviceAssets } from '../core/devices'
import { media, palette, render } from '../core/renderer'
import { Range, Color, Select, Toggle, NumberField } from './Controls'
import type { Panel } from './Inspector'
export type Change = (fn: (p: Project) => Project) => void
const styles: [FrameStyle, string][] = [
  ['default', 'Default'],
  ['glass-light', 'Glass Light'],
  ['glass-dark', 'Glass Dark'],
  ['liquid', 'Liquid Glass'],
  ['inset-light', 'Inset Light'],
  ['inset-dark', 'Inset Dark'],
  ['outline', 'Outline'],
  ['border', 'Border'],
  ['retro', 'Retro'],
  ['card', 'Card'],
  ['stack', 'Stack'],
  ['stack-2', 'Stack 2'],
]
export const poses: Partial<Layer>[] = [
  { x: 50, y: 50, scale: 1, rotate: 0, rotateX: 0, rotateY: 0 },
  { x: 50, y: 50, scale: 1.12, rotate: 0, rotateX: 12, rotateY: -16 },
  { x: 50, y: 50, scale: 1, rotate: -7, rotateX: 0, rotateY: 0 },
  { x: 50, y: 50, scale: 1.05, rotate: 0, rotateX: -12, rotateY: 20 },
  { x: 50, y: 50, scale: 1.1, rotate: 8, rotateX: 15, rotateY: -20 },
  { x: 50, y: 50, scale: 0.85, rotate: 0, rotateX: 25, rotateY: 0 },
  { x: 45, y: 51, scale: 1.2, rotate: -12, rotateX: 0, rotateY: -22 },
  { x: 55, y: 48, scale: 1.2, rotate: 10, rotateX: -15, rotateY: 18 },
]
export function fitMedia(p: Project, ratio: number) {
  const width = Math.min(75, ((75 * p.height) / p.width) * ratio)
  return { width, height: (width * p.width) / p.height / ratio }
}
const iconFor = (d: Device) =>
  d === 'iphone' || d === 'android'
    ? Smartphone
    : d === 'tablet'
      ? Tablet
      : d === 'watch'
        ? Watch
        : d === 'laptop'
          ? Laptop
          : d === 'desktop'
            ? Monitor
            : AppWindow
function Tabs({
  values,
  value,
  onChange,
}: {
  values: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="studio-tabs">
      {values.map((v) => (
        <button
          key={v}
          aria-pressed={value === v}
          className={value === v ? 'active' : ''}
          onClick={() => onChange(v)}
        >
          {v}
        </button>
      ))}
    </div>
  )
}
function Heading({ children }: { children: React.ReactNode }) {
  return <div className="studio-label">{children}</div>
}
export function PointPad({
  label,
  x,
  y,
  onChange,
  light = false,
}: {
  label: string
  x: number
  y: number
  onChange: (x: number, y: number) => void
  light?: boolean
}) {
  const down = useRef(false)
  const point = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onChange(
      Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
      Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
    )
  }
  return (
    <div
      className={'point-pad ' + (light ? 'light-pad' : '')}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(x)}
      aria-valuetext={`${Math.round(x)}, ${Math.round(y)}`}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 1 : 5
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault()
          onChange(
            Math.max(
              0,
              Math.min(
                100,
                x + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0),
              ),
            ),
            Math.max(
              0,
              Math.min(100, y + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0)),
            ),
          )
        }
      }}
      onPointerDown={(e) => {
        down.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        point(e)
      }}
      onPointerMove={(e) => {
        if (down.current) point(e)
      }}
      onPointerUp={() => {
        down.current = false
      }}
      onPointerCancel={() => {
        down.current = false
      }}
    >
      <span className="pad-axis horizontal" />
      <span className="pad-axis vertical" />
      <i style={{ left: x + '%', top: y + '%' }} />
    </div>
  )
}
export function MiniCanvas({ p, version = 0 }: { p: Project; version?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      const c = ref.current?.getContext('2d')
      if (c) {
        c.setTransform(208 / p.width, 0, 0, 156 / p.height, 0, 0)
        render(c, p, 0, media, true)
      }
    })
    return () => cancelAnimationFrame(handle)
  }, [p, version])
  return <canvas ref={ref} width={208} height={156} aria-hidden="true" />
}
export function MockupPanel({
  p,
  current,
  update,
  change,
  upload,
  openAdvanced,
  onCredits,
}: {
  p: Project
  current?: Layer
  update: (v: Partial<Layer>) => void
  change: Change
  upload: (id?: string) => void
  openAdvanced: (p: Panel) => void
  onCredits: () => void
}) {
  const [tab, setTab] = useState('Mockup'),
    [picker, setPicker] = useState(false),
    [category, setCategory] = useState('All'),
    [more, setMore] = useState(false),
    [light, setLight] = useState(false),
    [effect, setEffect] = useState('')
  const asset = current ? deviceAsset(current) : undefined
  const CurrentIcon = current ? iconFor(current.device) : AppWindow
  const choose = (device: Device, model = '', ratio = 1.6) => {
    if (!current) return
    const m = media.cache.get(current.src)
    if (device === 'none' && m)
      ratio =
        m instanceof HTMLVideoElement
          ? m.videoWidth / m.videoHeight
          : m.naturalWidth / m.naturalHeight
    update({
      device,
      model,
      displayOnly: false,
      landscape: false,
      finish: '',
      ...fitMedia(p, ratio),
    })
    setPicker(false)
  }
  return (
    <>
      <Tabs values={['Mockup', 'Frame']} value={tab} onChange={setTab} />
      {tab === 'Mockup' ? (
        <>
          <button
            className="device-current"
            aria-expanded={picker}
            onClick={() => setPicker(!picker)}
          >
            <span className="device-badge">
              <CurrentIcon size={25} />
            </span>
            <span>
              <strong>
                {asset?.name || devices.find((d) => d.id === current?.device)?.name || 'Screenshot'}
              </strong>
              <small>{asset ? `${asset.display[0]} / ${asset.display[1]}` : 'Image & video'}</small>
            </span>
            <ChevronDown size={16} />
          </button>
          <div className="studio-scroll">
            {!current ? (
              <button className="wide-button" onClick={() => upload()}>
                Add media
              </button>
            ) : (
              <>
                <Heading>Media</Heading>
                <button
                  className="media-tile"
                  onClick={() => upload(current.id)}
                  aria-label="Replace media"
                >
                  {current.src && current.mediaType === 'image' ? (
                    <img src={current.src} alt={current.name} />
                  ) : (
                    <ImagePlus size={27} />
                  )}
                  <span>{current.src ? 'Replace media' : 'Drop media or click to choose'}</span>
                </button>
                {current.mediaType === 'video' && (
                  <>
                    <Toggle
                      label="Audio"
                      value={!current.muted}
                      onChange={(v) => update({ muted: !v })}
                    />
                    <div className="two-columns">
                      <NumberField
                        label="Trim start"
                        value={current.trimStart}
                        min={0}
                        max={current.trimEnd - 0.01}
                        onChange={(v) => update({ trimStart: Math.min(v, current.trimEnd - 0.01) })}
                      />
                      <NumberField
                        label="Trim end"
                        value={current.trimEnd}
                        min={current.trimStart + 0.01}
                        onChange={(v) => update({ trimEnd: Math.max(v, current.trimStart + 0.01) })}
                      />
                    </div>
                    <Range
                      label="Playback speed"
                      value={current.speed}
                      min={0.25}
                      max={3}
                      step={0.25}
                      suffix="×"
                      onChange={(speed) => update({ speed })}
                    />
                  </>
                )}
                <Heading>Style</Heading>
                {asset ? (
                  <>
                    <div className="finish-options">
                      <button
                        className={!current.displayOnly ? 'active' : ''}
                        onClick={() => update({ displayOnly: false })}
                      >
                        <span className="finish-ball" />
                        Device
                      </button>
                      <button
                        className={current.displayOnly ? 'active' : ''}
                        onClick={() =>
                          update({
                            displayOnly: true,
                            radius:
                              Math.min(
                                (p.width * current.width) / 100,
                                (p.height * current.height) / 100,
                              ) * 0.13,
                          })
                        }
                      >
                        <span className="display-swatch" />
                        Display<small>3D</small>
                      </button>
                    </div>
                    {asset.body && !usesFlatDevices() && (
                      <div className="finish-colors">
                        {[
                          ['Original', ''],
                          ['Silver', '#c8c9cc'],
                          ['Graphite', '#414248'],
                          ['Blue', '#475c76'],
                        ].map(([name, color]) => (
                          <button
                            key={name}
                            title={name}
                            aria-label={name + ' finish'}
                            aria-pressed={current.finish === color}
                            onClick={() => update({ finish: color, displayOnly: false })}
                            style={{
                              background: color || 'linear-gradient(130deg,#9da5b1,#1c2534)',
                            }}
                          >
                            {current.finish === color && <Check size={13} />}
                          </button>
                        ))}
                      </div>
                    )}
                    <Toggle
                      label="Landscape"
                      value={current.landscape}
                      onChange={(v) =>
                        update({
                          landscape: v,
                          width: (current.height * p.height) / p.width,
                          height: (current.width * p.width) / p.height,
                        })
                      }
                    />
                  </>
                ) : (
                  <>
                    <div className="style-grid">
                      {styles.slice(0, more ? 12 : 8).map(([id, name]) => (
                        <button
                          key={id}
                          aria-pressed={current.style === id}
                          className={current.style === id ? 'active' : ''}
                          onClick={() => update({ style: id })}
                        >
                          <span className={'style-example style-' + id}>
                            <i />
                          </span>
                          <span>{name}</span>
                        </button>
                      ))}
                      {!more && (
                        <button
                          className="style-more"
                          aria-label="More frame styles"
                          onClick={() => setMore(true)}
                        >
                          <MoreHorizontal size={22} />
                        </button>
                      )}
                    </div>
                    <Heading>Corner</Heading>
                    <Tabs
                      values={['Sharp', 'Curved', 'Round']}
                      value={
                        current.radius === 0 ? 'Sharp' : current.radius > 40 ? 'Round' : 'Curved'
                      }
                      onChange={(v) =>
                        update({ radius: v === 'Sharp' ? 0 : v === 'Round' ? 90 : 20 })
                      }
                    />
                    <Range
                      label="Radius"
                      value={current.radius}
                      max={150}
                      onChange={(v) => update({ radius: v })}
                    />
                  </>
                )}
                <Heading>Shadow</Heading>
                <div className="shadow-options">
                  {(['none', 'spread', 'hug', 'adaptive'] as const).map((t) => (
                    <button
                      key={t}
                      aria-pressed={current.shadowType === t}
                      className={current.shadowType === t ? 'active' : ''}
                      onClick={() => update({ shadowType: t })}
                    >
                      <span className={'shadow-example shadow-' + t} />
                      {t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                <Range
                  label="Opacity"
                  value={current.shadow}
                  suffix="%"
                  onChange={(v) => update({ shadow: v })}
                />
                <button
                  className="adjust-light"
                  onClick={() => setLight(!light)}
                  aria-expanded={light}
                >
                  <Sun size={14} />
                  Adjust light
                </button>
                {light && (
                  <>
                    <PointPad
                      light
                      label="Shadow light position"
                      x={
                        50 -
                        Math.cos((current.shadowAngle * Math.PI) / 180) * current.shadowDistance
                      }
                      y={
                        50 -
                        Math.sin((current.shadowAngle * Math.PI) / 180) * current.shadowDistance
                      }
                      onChange={(x, y) =>
                        update({
                          shadowAngle: ((Math.atan2(50 - y, 50 - x) * 180) / Math.PI + 360) % 360,
                          shadowDistance: Math.hypot(50 - x, 50 - y),
                        })
                      }
                    />
                    <Color
                      label="Shadow color"
                      value={current.shadowColor}
                      onChange={(v) => update({ shadowColor: v })}
                    />
                  </>
                )}
                <Heading>Visibility</Heading>
                <button className="wide-button" onClick={() => update({ hidden: !current.hidden })}>
                  <EyeOff size={15} />
                  {current.hidden ? 'Show mockup' : 'Hide mockup'}
                </button>
                {asset && usesFlatDevices() && (
                  <p className="panel-note">
                    Front-view model render. Full 3D is available when WebGL is supported.
                  </p>
                )}
                <Heading>Details</Heading>
                <dl className="device-details">
                  <dt>Device</dt>
                  <dd>{asset?.name || 'Screenshot'}</dd>
                  {asset && (
                    <>
                      <dt>Screen pixels</dt>
                      <dd>{asset.display.join(' / ')}</dd>
                      {asset.year && (
                        <>
                          <dt>Release year</dt>
                          <dd>{asset.year}</dd>
                        </>
                      )}
                      <dt>Model</dt>
                      <dd>
                        <button className="inline-link" onClick={onCredits}>
                          Source & credit
                        </button>
                      </dd>
                    </>
                  )}
                </dl>
                <button className="wide-button" onClick={() => openAdvanced('style')}>
                  <SlidersHorizontal size={14} />
                  More adjustments
                </button>
              </>
            )}
          </div>
          {picker && (
            <>
              <button
                className="popover-dismiss"
                aria-label="Close device picker"
                onClick={() => setPicker(false)}
              />
              <div className="device-picker">
                <div className="popover-heading">
                  <h3>Mockup</h3>
                  <button aria-label="Close mockups" onClick={() => setPicker(false)}>
                    <X size={18} />
                  </button>
                </div>
                <Tabs
                  values={['All', 'Phones', 'Tablets', 'Computers', 'Watches']}
                  value={category}
                  onChange={setCategory}
                />
                <div className="device-catalog">
                  <Heading>Essentials</Heading>
                  <div className="device-card-grid">
                    {(
                      [
                        'none',
                        'browser',
                        'safari',
                        'arc',
                        'macos',
                        'windows',
                        'polaroid',
                      ] as Device[]
                    ).map((d) => (
                      <button
                        key={d}
                        onClick={() => choose(d)}
                        className={current?.device === d ? 'active' : ''}
                      >
                        <span className="catalog-art">
                          <AppWindow size={46} strokeWidth={1} />
                        </span>
                        {devices.find((v) => v.id === d)?.name}
                      </button>
                    ))}
                  </div>
                  <Heading>Device models</Heading>
                  <div className="device-card-grid">
                    {deviceAssets
                      .filter(
                        (a) =>
                          category === 'All' ||
                          (category === 'Phones' && ['iphone', 'android'].includes(a.device)) ||
                          (category === 'Tablets' && a.device === 'tablet') ||
                          (category === 'Computers' && ['laptop', 'desktop'].includes(a.device)) ||
                          (category === 'Watches' && a.device === 'watch'),
                      )
                      .map((a) => {
                        const Icon = iconFor(a.device)
                        return (
                          <button
                            key={a.id}
                            onClick={() => choose(a.device, a.id, a.ratio)}
                            className={asset?.id === a.id ? 'active' : ''}
                          >
                            <span className="catalog-art">
                              <Icon size={48} strokeWidth={1} />
                            </span>
                            {a.name}
                            <small>{a.year || 'Desktop'}</small>
                          </button>
                        )
                      })}
                  </div>
                  <p className="panel-note">
                    Independent models. Credit is included when you export a device mockup.
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <button className="device-current" onClick={() => setPicker(!picker)}>
            <span className="ratio-badge" />
            <span>
              <strong>
                {p.width / p.height === 4 / 3
                  ? 'Default 4:3'
                  : p.width === p.height
                    ? 'Square'
                    : p.width > p.height
                      ? 'Landscape'
                      : 'Portrait'}
              </strong>
              <small>
                {p.width} × {p.height}
              </small>
            </span>
            <ChevronDown size={16} />
          </button>
          {picker && (
            <div className="size-picker">
              {[{ name: 'Default 4:3', width: 1920, height: 1440 }, ...sizes].map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    change((p) => ({ ...p, width: s.width, height: s.height }))
                    setPicker(false)
                  }}
                >
                  <span>{s.name}</span>
                  <small>
                    {s.width} × {s.height}
                  </small>
                </button>
              ))}
              <button
                onClick={() => {
                  setPicker(false)
                  openAdvanced('layout')
                }}
              >
                Custom size
              </button>
            </div>
          )}
          <div className="studio-scroll">
            <Heading>Effects & watermark</Heading>
            <div className="effect-grid">
              {[
                ['Portrait', Aperture],
                ['Watermark', ImagePlus],
                ['Bg effects', Sun],
                ['VFX', Sparkles],
              ].map(([name, Icon]) => {
                const C = Icon as typeof Sun
                return (
                  <button
                    key={String(name)}
                    onClick={() => setEffect(effect === name ? '' : String(name))}
                  >
                    <span>
                      <C size={20} strokeWidth={1.5} />
                    </span>
                    {String(name)}
                  </button>
                )
              })}
            </div>
            {effect && (
              <div className="inline-options">
                <div className="popover-heading">
                  <h3>{effect}</h3>
                  <button aria-label="Close effect" onClick={() => setEffect('')}>
                    <X size={15} />
                  </button>
                </div>
                {effect === 'Bg effects' ? (
                  <>
                    <Range
                      label="Background noise"
                      value={p.background.noise}
                      max={50}
                      onChange={(noise) =>
                        change((p) => ({ ...p, background: { ...p.background, noise } }))
                      }
                    />
                    <Range
                      label="Background blur"
                      value={p.background.blur}
                      max={100}
                      onChange={(blur) =>
                        change((p) => ({ ...p, background: { ...p.background, blur } }))
                      }
                    />
                  </>
                ) : effect === 'VFX' ? (
                  <>
                    <div className="vfx-grid">
                      {(
                        [
                          'none',
                          'noise',
                          'vhs',
                          'tv',
                          'vhs-glitch',
                          'tech-glitch',
                          'light-leak',
                          'particles',
                          'glitter',
                        ] as const
                      ).map((v) => (
                        <button
                          key={v}
                          aria-pressed={p.effects.vfx === v}
                          className={p.effects.vfx === v ? 'active' : ''}
                          onClick={() =>
                            change((p) => ({ ...p, effects: { ...p.effects, vfx: v } }))
                          }
                        >
                          <span className={'vfx-swatch vfx-' + v} />
                          {v === 'vhs' || v === 'tv' ? v.toUpperCase() : v.replaceAll('-', ' ')}
                        </button>
                      ))}
                    </div>
                    <Range
                      label="Intensity"
                      value={p.effects.intensity}
                      onChange={(intensity) =>
                        change((p) => ({ ...p, effects: { ...p.effects, intensity } }))
                      }
                    />
                  </>
                ) : effect === 'Portrait' ? (
                  <>
                    <p className="panel-note">
                      Adjust the media blur. Automatic subject masking is not included.
                    </p>
                    {current && (
                      <Range
                        label="Media blur"
                        value={current.blur}
                        max={40}
                        onChange={(blur) => update({ blur })}
                      />
                    )}
                  </>
                ) : (
                  <button className="wide-button" onClick={() => openAdvanced('brand')}>
                    Watermark settings
                  </button>
                )}
              </div>
            )}
            <Heading>Scene</Heading>
            <div className="scene-options">
              {(['none', 'window', 'leaves', 'diagonal'] as const).map((v, i) => (
                <button
                  key={v}
                  aria-pressed={p.background.overlay === v}
                  onClick={() =>
                    change((p) => ({ ...p, background: { ...p.background, overlay: v } }))
                  }
                >
                  <span className={'scene-example scene-' + v} />
                  {['None', 'Window', 'Leaves', 'Stripes'][i]}
                </button>
              ))}
            </div>
            <Heading>Background</Heading>
            <div className="background-types">
              {[
                ['transparent', 'Transparent'],
                ['solid', 'Color'],
                ['image', 'Image'],
                ['gradient', 'Gradient'],
              ].map(([id, name]) => (
                <button
                  key={id}
                  className={p.background.type === id ? 'active' : ''}
                  onClick={() => {
                    if (id === 'image') upload('background')
                    else
                      change((p) => ({
                        ...p,
                        background: { ...p.background, type: id as Project['background']['type'] },
                      }))
                  }}
                >
                  <span className={'bg-type bg-' + id} />
                  {name}
                </button>
              ))}
            </div>
            <Heading>Magic</Heading>
            <div className="swatch-grid">
              {current?.src &&
                (media.cache.has(current.src) ? palette(media.cache.get(current.src)!) : []).map(
                  (color, i) => (
                    <button
                      key={i}
                      aria-label={'Media color ' + (i + 1)}
                      style={{ background: color }}
                      onClick={() =>
                        change((p) => ({
                          ...p,
                          background: { ...p.background, type: 'solid', colors: [color] },
                        }))
                      }
                    />
                  ),
                )}
              {current?.src && (
                <button
                  className="magic-media"
                  aria-label="Blurred media background"
                  onClick={() =>
                    change((p) => ({
                      ...p,
                      background: { ...p.background, type: 'image', src: current.src, blur: 60 },
                    }))
                  }
                >
                  <Sparkles size={18} />
                </button>
              )}
            </div>
            <Heading>Solid</Heading>
            <div className="swatch-grid">
              {[
                '#ffffff',
                '#e9e8e4',
                '#1f2022',
                '#000000',
                '#d4e4e1',
                '#b8e8ce',
                '#d9e8ce',
                '#d2f68d',
              ].map((color) => (
                <button
                  key={color}
                  aria-label={color + ' background'}
                  style={{ background: color }}
                  onClick={() =>
                    change((p) => ({
                      ...p,
                      background: { ...p.background, type: 'solid', colors: [color] },
                    }))
                  }
                />
              ))}
            </div>
            <Heading>Gradient</Heading>
            <div className="swatch-grid gradient-grid">
              {[...backgrounds].map((bg) => (
                <button
                  key={bg.name}
                  aria-label={bg.name + ' gradient'}
                  style={{ background: `linear-gradient(135deg,${bg.colors.join(',')})` }}
                  onClick={() =>
                    change((p) => ({
                      ...p,
                      background: {
                        ...p.background,
                        type: 'gradient',
                        colors: bg.colors,
                        angle: 45,
                      },
                    }))
                  }
                />
              ))}
            </div>
            <button className="wide-button" onClick={() => openAdvanced('background')}>
              <SlidersHorizontal size={14} />
              Background settings
            </button>
          </div>
        </>
      )}
    </>
  )
}
export function LayoutPanel({
  p,
  current,
  update,
  change,
  version,
  editingBeat,
  onDone,
}: {
  p: Project
  current?: Layer
  update: (v: Partial<Layer>) => void
  change: Change
  version: number
  editingBeat: string
  onDone: () => void
}) {
  const [tab, setTab] = useState('Zoom')
  const beat = current?.beats.find((b) => b.id === editingBeat),
    pose = beat ? { ...current, ...beat.pose } : current
  // Playback changes time, not the preset documents. Keep thumbnail canvases stable.
  const layoutPreviews = useMemo<Project[]>(
    () =>
      poses.map((values) => ({
        ...p,
        layers: p.layers.map((l) =>
          l.id === current?.id
            ? { ...l, ...values, motion: 'none' as const, beats: [], keyframes: [] }
            : l,
        ),
      })),
    [p, current?.id],
  )
  const poseUpdate = (values: Partial<Layer>) => {
    if (beat && current)
      change((p) => ({
        ...p,
        layers: p.layers.map((l) =>
          l.id === current.id
            ? {
                ...l,
                beats: l.beats.map((b) =>
                  b.id === beat.id ? { ...b, pose: { ...b.pose, ...values } } : b,
                ),
              }
            : l,
        ),
      }))
    else update(values)
  }
  function quantity(n: number) {
    change((p) => {
      const mediaLayers = p.layers.filter((l) => l.kind === 'media'),
        source = mediaLayers[0] || layer(),
        others = p.layers.filter((l) => l.kind !== 'media'),
        items = Array.from({ length: n }, (_, i) => ({
          ...(mediaLayers[i] || source),
          id: mediaLayers[i]?.id || uid(),
          x: n === 1 ? 50 : 50 + (i - (n - 1) / 2) * 28,
          y: 50,
          scale: n === 1 ? 1 : 0.68,
        }))
      return { ...p, layers: [...items, ...others] }
    })
  }
  return (
    <>
      {editingBeat && (
        <div className="animation-heading">
          <strong>Animation</strong>
          <button onClick={onDone}>Done</button>
        </div>
      )}
      <div className="quantity-tabs">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            aria-label={n + ' mockup' + (n > 1 ? 's' : '')}
            aria-pressed={p.layers.filter((l) => l.kind === 'media').length === n}
            onClick={() => quantity(n)}
          >
            {Array.from({ length: n }, (_, i) => (
              <i key={i} />
            ))}
          </button>
        ))}
      </div>
      {beat && (
        <Range
          label="Transition"
          value={beat.duration}
          min={0.1}
          max={10}
          step={0.1}
          suffix="s"
          onChange={(duration) =>
            change((p) => ({
              ...p,
              layers: p.layers.map((l) =>
                l.id === current?.id
                  ? { ...l, beats: l.beats.map((b) => (b.id === beat.id ? { ...b, duration } : b)) }
                  : l,
              ),
            }))
          }
        />
      )}
      <Tabs values={['Zoom', 'Tilt']} value={tab} onChange={setTab} />
      {pose && (
        <>
          <PointPad
            label={tab === 'Tilt' ? 'Tilt control' : 'Position control'}
            x={tab === 'Tilt' ? 50 + pose.rotateY / 1.4 : pose.x}
            y={tab === 'Tilt' ? 50 - pose.rotateX / 1.4 : pose.y}
            onChange={(x, y) =>
              poseUpdate(
                tab === 'Tilt' ? { rotateX: (50 - y) * 1.4, rotateY: (x - 50) * 1.4 } : { x, y },
              )
            }
          />
          <span className="pad-hint">Drag to {tab === 'Tilt' ? 'rotate' : 'position'}</span>
          <Range
            label={tab === 'Tilt' ? 'Rotation' : 'Zoom'}
            value={tab === 'Tilt' ? pose.rotate : pose.scale * 100}
            min={tab === 'Tilt' ? -180 : 20}
            max={tab === 'Tilt' ? 180 : 200}
            suffix={tab === 'Tilt' ? '°' : '%'}
            onChange={(v) => poseUpdate(tab === 'Tilt' ? { rotate: v } : { scale: v / 100 })}
          />
          <button className="reset-layout" onClick={() => poseUpdate(poses[0])}>
            <RotateCcw size={12} />
            Reset layout
          </button>
          <Heading>Layout presets</Heading>
          <div className="layout-presets">
            {poses.map((values, i) => {
              const thumb = layoutPreviews[i]
              return (
                <button key={i} aria-label={'Layout ' + (i + 1)} onClick={() => poseUpdate(values)}>
                  <MiniCanvas p={thumb} version={version} />
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
export function BeatTimeline({
  p,
  current,
  time,
  setTime,
  change,
  editing,
  setEditing,
}: {
  p: Project
  current?: Layer
  time: number
  setTime: (t: number) => void
  change: Change
  editing: string
  setEditing: (id: string) => void
}) {
  const moving = useRef<{
    id: string
    x: number
    time: number
    duration: number
    edge: number
  } | null>(null)
  return (
    <div className="beat-timeline">
      <div className="timeline-labels">
        <span>Animations</span>
        <span>{current?.name || 'Media'}</span>
      </div>
      <div
        className="beat-tracks"
        onPointerMove={(e) => {
          const d = moving.current
          if (!d || !current) return
          const rect = e.currentTarget.getBoundingClientRect(),
            delta = ((e.clientX - d.x) / rect.width) * p.animation.duration
          change((p) => ({
            ...p,
            layers: p.layers.map((l) =>
              l.id === current.id
                ? {
                    ...l,
                    beats: l.beats.map((b) =>
                      b.id === d.id
                        ? {
                            ...b,
                            ...(d.edge
                              ? {
                                  duration: Math.max(
                                    0.1,
                                    Math.min(20, d.duration + delta * 2 * d.edge),
                                  ),
                                }
                              : {
                                  time: Math.max(0, Math.min(p.animation.duration, d.time + delta)),
                                }),
                          }
                        : b,
                    ),
                  }
                : l,
            ),
          }))
        }}
        onPointerUp={() => {
          moving.current = null
        }}
        onPointerCancel={() => {
          moving.current = null
        }}
      >
        <div className="beat-ruler">
          {Array.from({ length: 11 }, (_, i) => (
            <span key={i}>{i === 0 ? '0' : ((p.animation.duration * i) / 10).toFixed(1)}</span>
          ))}
        </div>
        <input
          className="beat-playhead-input"
          aria-label="Animation playhead"
          type="range"
          min={0}
          max={p.animation.duration}
          step={0.01}
          value={time}
          onChange={(e) => setTime(+e.target.value)}
        />
        <div className="beat-lane">
          {current?.beats.map((b) => (
            <button
              key={b.id}
              aria-label={'Animation at ' + b.time.toFixed(1) + ' seconds'}
              className={'beat-clip ' + (editing === b.id ? 'active' : '')}
              style={{
                left: `${((b.time - b.duration / 2) / p.animation.duration) * 100}%`,
                width: `${(b.duration / p.animation.duration) * 100}%`,
              }}
              onClick={() => {
                setEditing(b.id)
                setTime(b.time)
              }}
              onPointerDown={(e) => {
                e.currentTarget.parentElement?.parentElement?.setPointerCapture(e.pointerId)
                moving.current = {
                  id: b.id,
                  x: e.clientX,
                  time: b.time,
                  duration: b.duration,
                  edge: Number((e.target as HTMLElement).dataset.edge || 0),
                }
              }}
            >
              <i data-edge="-1" />
              <Diamond size={17} />
              <i data-edge="1" />
            </button>
          ))}
        </div>
        <div className="media-clip" onClick={() => setEditing('')}>
          {current?.src && current.mediaType === 'image' && <img src={current.src} alt="" />}
          <span>
            {current?.mediaType === 'video' ? 'Video' : 'Image'} · {p.animation.duration}s
          </span>
        </div>
        <span
          className="timeline-cursor"
          style={{ left: `${(time / p.animation.duration) * 100}%` }}
        />
      </div>
      {editing && current && (
        <button
          className="delete-beat"
          aria-label="Delete animation"
          onClick={() => {
            change((p) => ({
              ...p,
              layers: p.layers.map((l) =>
                l.id === current.id ? { ...l, beats: l.beats.filter((b) => b.id !== editing) } : l,
              ),
            }))
            setEditing('')
          }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
