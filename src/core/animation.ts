import type { Keyframe, Layer, Project } from './model'
export function ease(t: number, mode: Project['animation']['easing']) {
  t = Math.max(0, Math.min(1, t))
  if (mode === 'ease-in') return t * t * t
  if (mode === 'ease-out') return 1 - Math.pow(1 - t, 3)
  if (mode === 'ease-in-out') return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  if (mode === 'spring')
    return t === 0 || t === 1
      ? t
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
  return t
}
export function interpolate(
  frames: Keyframe[],
  time: number,
  easing: Project['animation']['easing'],
): Partial<Layer> {
  const sorted = [...frames].sort((a, b) => a.time - b.time)
  if (!sorted.length) return {}
  if (time <= sorted[0].time) {
    const { id, time, ...values } = sorted[0]
    return values
  }
  if (time >= sorted.at(-1)!.time) {
    const { id, time, ...values } = sorted.at(-1)!
    return values
  }
  const i = sorted.findIndex((f) => f.time >= time),
    a = sorted[i - 1],
    b = sorted[i],
    t = ease((time - a.time) / (b.time - a.time), easing)
  const out: Record<string, number> = {}
  for (const k of ['x', 'y', 'scale', 'rotate', 'rotateX', 'rotateY', 'opacity'] as const)
    out[k] = a[k] + (b[k] - a[k]) * t
  return out
}
export function animatedLayer(l: Layer, p: Project, time: number): Layer {
  if (l.keyframes.length) return { ...l, ...interpolate(l.keyframes, time, p.animation.easing) }
  const progress = Math.max(0, Math.min(1, time / p.animation.duration)),
    t = ease(progress, p.animation.easing),
    wave = Math.sin(progress * Math.PI * 2),
    s = { ...l }
  switch (l.motion) {
    case 'zoom-in':
      s.scale *= 0.8 + 0.4 * t
      break
    case 'zoom-out':
      s.scale *= 1.2 - 0.4 * t
      break
    case 'focus':
      s.scale *= 1 + (p.animation.zoom - 1) * Math.sin(t * Math.PI)
      s.x += (50 - p.animation.focusX) * Math.sin(t * Math.PI) * 0.5
      s.y += (50 - p.animation.focusY) * Math.sin(t * Math.PI) * 0.5
      break
    case 'pan-left':
      s.x += 12 - 24 * t
      break
    case 'pan-right':
      s.x += -12 + 24 * t
      break
    case 'pan-up':
      s.y += 12 - 24 * t
      break
    case 'pan-down':
      s.y += -12 + 24 * t
      break
    case 'float':
      s.y += wave * 3
      s.rotate += Math.cos(progress * Math.PI * 2) * 1.5
      break
    case 'orbit':
      s.x += Math.cos(progress * Math.PI * 2) * 6
      s.y += wave * 3
      break
    case 'pulse':
      s.scale *= 1 + wave * 0.05
      break
    case 'swing':
      s.rotate += wave * 8
      break
    case 'rock':
      s.rotateY += wave * 20
      break
    case 'parallax':
      s.rotateX += Math.cos(progress * Math.PI * 2) * 10
      s.rotateY += wave * 20
      break
    case 'depth':
      s.scale *= 0.6 + 0.4 * t
      s.rotateY += (1 - t) * 38
      break
    case 'flip-x':
      s.rotateX += 360 * t
      break
    case 'flip-y':
      s.rotateY += 360 * t
      break
    case 'spin':
      s.rotate += 360 * t
      break
    case 'reveal':
      s.scale *= 0.7 + 0.3 * t
      s.opacity *= t
      break
    case 'fade':
      s.opacity *= t
      break
    case 'bounce':
      s.scale *= ease(progress, 'spring')
      break
    case 'rise':
      s.y += (1 - t) * 40
      s.opacity *= t
      break
    case 'drop':
      s.y -= (1 - t) * 40
      s.opacity *= t
      break
    case 'slide-left':
      s.x += (1 - t) * 60
      break
    case 'slide-right':
      s.x -= (1 - t) * 60
      break
  }
  return s
}
