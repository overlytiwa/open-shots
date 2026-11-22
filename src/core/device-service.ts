import type { Layer, Project } from './model'
import { deviceAsset } from './devices'
type Source = HTMLImageElement | HTMLVideoElement
interface Frame {
  mask?: string
  file: string
  width: number
  height: number
  screen: { x: number; y: number; width: number; height: number }
  screenQuad?: { x: number; y: number }[]
  radius?: number
}
let engine: typeof import('./device-renderer') | undefined
let gpu = true,
  initialized: Promise<void> | undefined
let metadata: Promise<Record<string, Frame>> | undefined
const frames = new Map<string, HTMLImageElement>(),
  surfaces = new Map<string, HTMLCanvasElement>()
async function init() {
  if (!initialized)
    initialized = import('./device-renderer').then((m) => {
      engine = m
    })
  await initialized
}
export function usesFlatDevices() {
  return !gpu
}
export const deviceRenderer = {
  async prepare(layers: Layer[]) {
    const devices = layers.filter((l) => !l.hidden && !l.displayOnly && l.src && deviceAsset(l))
    if (!devices.length) return
    if (gpu) {
      try {
        await init()
        await engine!.deviceRenderer.prepare(layers)
        return
      } catch (error) {
        console.info('3D rendering unavailable; using model render fallbacks', error)
        gpu = false
      }
    }
    if (!metadata)
      metadata = fetch(`${import.meta.env.BASE_URL}models/frames/frames.json`).then((r) => {
        if (!r.ok) throw Error('Device frame images could not be loaded')
        return r.json()
      })
    const all = await metadata
    await Promise.all(
      devices.map(async (l) => {
        const id = deviceAsset(l)!.id,
          entry = all[id]
        if (!entry) throw Error(`A fallback frame is not available for ${deviceAsset(l)!.name}`)
        await Promise.all(
          [[id, entry.file], ...(entry.mask ? [[id + ':mask', entry.mask]] : [])].map(
            async ([key, file]) => {
              if (frames.has(key)) return
              const image = new Image()
              await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve()
                image.onerror = () => reject(Error('Device frame image could not be loaded'))
                image.src = `${import.meta.env.BASE_URL}models/frames/${file}`
              })
              frames.set(key, image)
            },
          ),
        )
      }),
    )
  },
  draw(
    l: Layer,
    p: Project,
    source: Source | undefined,
    density: number,
  ): { canvas: HTMLCanvasElement; projected: boolean } | undefined {
    if (gpu) {
      const canvas = engine?.deviceRenderer.draw(l, p, source, density)
      return canvas ? { canvas, projected: true } : undefined
    }
    const asset = deviceAsset(l),
      frame = asset && frames.get(asset.id)
    if (!asset || !frame || !source) return
    const meta = (frame as HTMLImageElement & { frame?: Frame }).frame
    if (!meta) return
    const out = surfaces.get(l.id) || document.createElement('canvas')
    surfaces.set(l.id, out)
    const lw = (p.width * l.width) / 100,
      lh = (p.height * l.height) / 100,
      w = Math.max(8, Math.round(lw * density)),
      h = Math.max(8, Math.round(lh * density))
    if (out.width !== w) out.width = w
    if (out.height !== h) out.height = h
    const c = out.getContext('2d')!
    c.clearRect(0, 0, w, h)
    c.save()
    c.translate(w / 2, h / 2)
    if (l.landscape) c.rotate(-Math.PI / 2)
    const fw = frame.naturalWidth,
      fh = frame.naturalHeight,
      factor = Math.min((l.landscape ? h : w) / fw, (l.landscape ? w : h) / fh)
    c.scale(factor, factor)
    c.translate(-fw / 2, -fh / 2)
    const b = meta.screen,
      x = b.x * fw,
      y = b.y * fh,
      sw = b.width * fw,
      sh = b.height * fh
    c.save()
    c.beginPath()
    if (meta.screenQuad) {
      meta.screenQuad.forEach((v, i) =>
        i ? c.lineTo(v.x * fw, v.y * fh) : c.moveTo(v.x * fw, v.y * fh),
      )
      c.closePath()
    } else c.roundRect(x, y, sw, sh, (meta.radius || 0.03) * Math.min(sw, sh))
    c.clip()
    c.fillStyle = '#000'
    c.fillRect(x, y, sw, sh)
    const iw = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth,
      ih = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight,
      s = (l.fit === 'contain' ? Math.min : Math.max)(sw / iw, sh / ih) * l.zoom,
      dw = iw * s,
      dh = ih * s
    c.filter = `brightness(${l.brightness}%) contrast(${l.contrast}%) saturate(${l.saturation}%) blur(${l.blur}px)${l.filter === 'mono' ? ' grayscale(1)' : ''}`
    c.translate(x + sw / 2, y + sh / 2)
    c.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1)
    c.drawImage(
      source,
      -sw / 2 + ((sw - dw) * l.cropX) / 100,
      -sh / 2 + ((sh - dh) * l.cropY) / 100,
      dw,
      dh,
    )
    c.restore()
    const mask = frames.get(asset.id + ':mask')
    if (mask) {
      c.globalCompositeOperation = 'destination-in'
      c.drawImage(mask, 0, 0)
      c.globalCompositeOperation = 'source-over'
    }
    c.drawImage(frame, 0, 0)
    c.restore()
    return { canvas: out, projected: false }
  },
}
// The metadata lives with the rendered image, so cached images cannot use another model's opening.
const prepare = deviceRenderer.prepare.bind(deviceRenderer)
deviceRenderer.prepare = async (layers) => {
  await prepare(layers)
  if (!gpu && metadata) {
    const all = await metadata
    for (const [id, frame] of frames)
      (frame as HTMLImageElement & { frame?: Frame }).frame = all[id]
  }
}
