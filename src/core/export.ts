import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { media, render } from './renderer'
import { deviceCredits } from './devices'
import type { Project } from './model'
export type Format = 'png' | 'jpeg' | 'webp' | 'mp4' | 'webm' | 'gif'
export interface ExportOptions {
  format: Format
  scale: number
  quality: number
  time?: number
  signal?: AbortSignal
  progress: (n: number) => void
}
export function outputSize(p: Project, scale: number) {
  const width = Math.round(p.width * scale),
    height = Math.round(p.height * scale)
  if (width > 8192 || height > 8192 || width * height > 33_554_432)
    throw Error('Use a smaller size. Exports support up to 8192 px per side and 32 megapixels')
  return { width, height }
}
function check(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError')
}
const tick = () => new Promise<void>((r) => setTimeout(r, 0))
export async function exportProject(p: Project, o: ExportOptions): Promise<Blob> {
  const dimensions = outputSize(p, o.scale),
    cv = document.createElement('canvas')
  cv.width = dimensions.width
  cv.height = dimensions.height
  const c = cv.getContext('2d', { willReadFrequently: o.format === 'gif' })!
  c.scale(o.scale, o.scale)
  await media.prepare(p)
  await media.seek(p, ['png', 'jpeg', 'webp'].includes(o.format) ? o.time || 0 : 0)
  check(o.signal)
  if (['png', 'jpeg', 'webp'].includes(o.format)) {
    render(c, p, o.time || 0)
    o.progress(1)
    return await new Promise<Blob>((res, rej) =>
      cv.toBlob(
        (b) => (b ? res(b) : rej(Error('Image encoding failed'))),
        `image/${o.format}`,
        o.quality,
      ),
    )
  }
  const fps = o.format === 'gif' ? Math.min(15, p.animation.fps) : p.animation.fps,
    count = Math.ceil(p.animation.duration * fps)
  if (o.format === 'gif') {
    if (cv.width * cv.height > 4_000_000)
      throw Error(
        'GIF exports support up to 4 megapixels. Choose a lower scale, or use MP4 for larger animations',
      )
    const gif = GIFEncoder()
    for (let frame = 0; frame < count; frame++) {
      check(o.signal)
      await media.seek(p, frame / fps)
      render(c, p, frame / fps)
      const data = c.getImageData(0, 0, cv.width, cv.height).data,
        palette = quantize(data, Math.max(32, Math.round(256 * o.quality)), { format: 'rgba4444' }),
        indexed = applyPalette(data, palette, 'rgba4444')
      const transparentIndex = palette.findIndex((color: number[]) => color[3] < 128)
      gif.writeFrame(indexed, cv.width, cv.height, {
        palette,
        delay: (Math.round(((frame + 1) * 100) / fps) - Math.round((frame * 100) / fps)) * 10,
        repeat: p.animation.loop ? 0 : -1,
        transparent: transparentIndex >= 0,
        transparentIndex: Math.max(0, transparentIndex),
        dispose: 2,
      })
      o.progress((frame + 1) / count)
      await tick()
    }
    gif.finish()
    return new Blob([gif.bytesView()], { type: 'image/gif' })
  }
  const encodeCanvas = document.createElement('canvas')
  encodeCanvas.width = cv.width + (o.format === 'mp4' ? cv.width % 2 : 0)
  encodeCanvas.height = cv.height + (o.format === 'mp4' ? cv.height % 2 : 0)
  const ec = encodeCanvas.getContext('2d')!
  const audioLayers = p.layers.filter(
    (l) => !l.hidden && l.kind === 'media' && l.mediaType === 'video' && !l.muted && l.src,
  )
  let mixedAudio: AudioBuffer | undefined
  if (audioLayers.length) {
    const offline = new OfflineAudioContext(2, Math.ceil(p.animation.duration * 48000), 48000)
    for (const l of audioLayers) {
      check(o.signal)
      let buffer: AudioBuffer
      try {
        const bytes = Uint8Array.from(atob(l.src.slice(l.src.indexOf(',') + 1)), (c) =>
          c.charCodeAt(0),
        )
        buffer = await offline.decodeAudioData(bytes.buffer)
      } catch {
        throw Error(
          'The audio in this video could not be decoded. Mute the clip or choose another video format',
        )
      }
      const source = offline.createBufferSource()
      source.buffer = buffer
      source.playbackRate.value = l.speed
      source.loop = true
      source.loopStart = Math.min(l.trimStart, Math.max(0, buffer.duration - 0.01))
      source.loopEnd = Math.max(
        source.loopStart + 0.01,
        Math.min(l.trimEnd || buffer.duration, buffer.duration),
      )
      source.connect(offline.destination)
      source.start(0, source.loopStart)
      source.stop(p.animation.duration)
    }
    mixedAudio = await offline.startRendering()
  }
  const { exportCanvas } = await import('./encode')
  return exportCanvas(
    encodeCanvas,
    async (t) => {
      check(o.signal)
      await media.seek(p, t)
      render(c, p, t)
      ec.clearRect(0, 0, encodeCanvas.width, encodeCanvas.height)
      if (o.format === 'mp4') {
        ec.fillStyle = '#000'
        ec.fillRect(0, 0, encodeCanvas.width, encodeCanvas.height)
      }
      ec.drawImage(cv, 0, 0)
      await tick()
    },
    {
      format: o.format as 'mp4' | 'webm',
      duration: p.animation.duration,
      fps,
      mixedAudio,
      transparent: o.format === 'webm' && p.background.type === 'transparent',
      signal: o.signal,
      onProgress: o.progress,
      credits: deviceCredits(p.layers),
      quality: o.quality,
    },
  )
}
