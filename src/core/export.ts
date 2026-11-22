import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { media, render } from './renderer'
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
        palette = quantize(data, 256, { format: 'rgba4444' }),
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
  if (o.format === 'mp4' && typeof VideoEncoder !== 'undefined') {
    // H.264 requires even dimensions. Pad the encoder surface by at most one pixel.
    const ec = document.createElement('canvas')
    ec.width = cv.width + (cv.width % 2)
    ec.height = cv.height + (cv.height % 2)
    const ectx = ec.getContext('2d')!
    let config: VideoEncoderConfig | undefined
    for (const codec of ['avc1.640034', 'avc1.420033', 'avc1.42002a']) {
      try {
        const candidate: VideoEncoderConfig = {
          codec,
          width: ec.width,
          height: ec.height,
          bitrate: Math.round(3_000_000 + o.quality * 9_000_000),
          framerate: fps,
        }
        if ((await VideoEncoder.isConfigSupported(candidate)).supported) {
          config = candidate
          break
        }
      } catch {}
    }
    if (config) {
      const target = new ArrayBufferTarget(),
        muxer = new Muxer({
          target,
          video: { codec: 'avc', width: ec.width, height: ec.height },
          fastStart: 'in-memory',
          firstTimestampBehavior: 'offset',
        })
      let error: Error | undefined
      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => {
          error = e
        },
      })
      encoder.configure(config)
      try {
        for (let frame = 0; frame < count; frame++) {
          check(o.signal)
          if (error) throw error
          await media.seek(p, frame / fps)
          render(c, p, frame / fps)
          ectx.fillStyle = '#000'
          ectx.fillRect(0, 0, ec.width, ec.height)
          ectx.drawImage(cv, 0, 0)
          const vf = new VideoFrame(ec, {
            timestamp: Math.round((frame / fps) * 1_000_000),
            duration: Math.round(1_000_000 / fps),
          })
          encoder.encode(vf, { keyFrame: frame % Math.max(1, fps * 2) === 0 })
          vf.close()
          if (encoder.encodeQueueSize > 8) await encoder.flush()
          o.progress((frame + 1) / count)
          await tick()
        }
        await encoder.flush()
        if (error) throw error
        muxer.finalize()
        return new Blob([target.buffer], { type: 'video/mp4' })
      } finally {
        encoder.close()
      }
    }
  }
  const requested =
    o.format === 'mp4'
      ? ['video/mp4;codecs=avc1', 'video/mp4']
      : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  const mime = requested.find(
    (m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m),
  )
  if (!mime)
    throw Error(
      `${o.format.toUpperCase()} encoding is not available in this browser. Try WebM, GIF, or the desktop app`,
    )
  const stream = cv.captureStream(fps),
    chunks: Blob[] = []
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: Math.round(3_000_000 + o.quality * 9_000_000),
  })
  const stopped = new Promise<void>((res, rej) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    recorder.onstop = () => res()
    recorder.onerror = () => rej(Error('Video recording failed'))
  })
  try {
    render(c, p, 0)
    recorder.start()
    const start = performance.now()
    for (let frame = 0; frame < count; frame++) {
      check(o.signal)
      await media.seek(p, frame / fps)
      render(c, p, frame / fps)
      o.progress((frame + 1) / count)
      const delay = ((frame + 1) / fps) * 1000 - (performance.now() - start)
      if (delay > 0) await new Promise((r) => setTimeout(r, delay))
    }
    recorder.stop()
    await stopped
    return new Blob(chunks, { type: mime.split(';')[0] })
  } finally {
    if (recorder.state !== 'inactive') recorder.stop()
    stream.getTracks().forEach((t) => t.stop())
  }
}
