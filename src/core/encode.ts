import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
} from 'mediabunny'

// `mixedAudio` must already contain the complete, trimmed timeline mix.
// `renderAt` must synchronously draw, or resolve after all seeking/decoding/drawing.
export async function exportCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  renderAt: (seconds: number) => void | Promise<void>,
  options: {
    format: 'mp4' | 'webm'
    duration: number
    fps: number
    mixedAudio?: AudioBuffer
    transparent?: boolean
    signal?: AbortSignal
    credits?: string
    quality?: number
    onProgress?: (fraction: number) => void
  },
): Promise<Blob> {
  const { format, duration, fps, mixedAudio, signal } = options
  if (!(duration > 0) || !(fps > 0) || !Number.isFinite(duration * fps)) {
    throw new Error('Duration and FPS must be finite and positive')
  }
  if (options.transparent && format !== 'webm') {
    throw new Error('Choose WebM for transparent video')
  }
  const transparent = !!options.transparent
  const videoCodec = format === 'mp4' ? 'avc' : 'vp9'
  const audioCodec = format === 'mp4' ? 'aac' : 'opus'
  const videoQuality = new Quality({
    bitrate: Math.round(3_000_000 + (options.quality ?? 0.92) * 9_000_000),
  })
  const audioQuality = new Quality({ bitrate: 192_000 })
  if (
    !(await canEncodeVideo(videoCodec, {
      width: canvas.width,
      height: canvas.height,
      frameRate: fps,
      quality: videoQuality,
      latencyMode: 'quality',
      alpha: transparent ? 'keep' : 'discard',
    }))
  )
    throw new Error(`Video encoder unavailable for ${videoCodec} at this size/FPS`)
  if (mixedAudio && audioCodec === 'aac' && !(await canEncodeAudio('aac'))) {
    const { registerAacEncoder } = await import('@mediabunny/aac-encoder')
    registerAacEncoder()
  }
  if (
    mixedAudio &&
    !(await canEncodeAudio(audioCodec, {
      numberOfChannels: mixedAudio.numberOfChannels,
      sampleRate: mixedAudio.sampleRate,
      quality: audioQuality,
    }))
  )
    throw new Error(`Audio encoder unavailable for ${audioCodec}`)

  const target = new BufferTarget()
  const output = new Output({
    format: format === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat(),
    target,
  })
  if (options.credits)
    output.setMetadataTags({ comment: options.credits, description: options.credits })
  const video = new CanvasSource(canvas, {
    codec: videoCodec,
    quality: videoQuality,
    latencyMode: 'quality',
    alpha: transparent ? 'keep' : 'discard',
    keyFrameInterval: 2,
  })
  output.addVideoTrack(video, { frameRate: fps, canBeTransparent: transparent })
  const audio = mixedAudio
    ? new AudioBufferSource({ codec: audioCodec, quality: audioQuality })
    : null
  if (audio) output.addAudioTrack(audio)

  try {
    signal?.throwIfAborted()
    await output.start()
    await Promise.all([
      (async () => {
        const count = Math.ceil(duration * fps)
        for (let i = 0; i < count; i++) {
          signal?.throwIfAborted()
          const t = i / fps
          await renderAt(t)
          await video.add(t, Math.min(1 / fps, duration - t), {
            keyFrame: i === 0,
          })
          options.onProgress?.((i + 1) / count)
        }
        video.close()
      })(),
      (async () => {
        if (audio && mixedAudio) {
          await audio.add(mixedAudio)
          audio.close()
        }
      })(),
    ])
    signal?.throwIfAborted()
    await output.finalize()
    if (!target.buffer) throw new Error('Output finalized without a buffer')
    return new Blob([target.buffer], { type: output.format.mimeType })
  } catch (error) {
    await output.cancel()
    throw error
  }
}

// AudioBufferSource appends, so mix tracks with Web Audio before encoding.
// All clip positions and offsets below are in seconds and non-negative.
export async function mixAudioOffline(
  clips: Array<{ buffer: AudioBuffer; at: number; gain?: number; offset?: number }>,
  duration: number,
  sampleRate = 48_000,
): Promise<AudioBuffer> {
  const offline = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate)
  for (const clip of clips) {
    const source = offline.createBufferSource()
    source.buffer = clip.buffer
    const gain = offline.createGain()
    gain.gain.value = clip.gain ?? 1
    source.connect(gain).connect(offline.destination)
    source.start(clip.at, clip.offset ?? 0)
  }
  return offline.startRendering()
}
