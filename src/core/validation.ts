import { devices, layer, motions, newProject, uid, type Project, type Layer } from './model'
const obj = (v: unknown): Record<string, any> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {}
const num = (v: unknown, d: number, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d
const str = (v: unknown, d: string, max = 200) => (typeof v === 'string' ? v.slice(0, max) : d)
const color = (v: unknown, d: string) => (typeof v === 'string' && /^#[\da-f]{6}$/i.test(v) ? v : d)
const choice = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
  allowed.includes(v as T) ? (v as T) : d
const src = (v: unknown) =>
  typeof v === 'string' && (v.startsWith('data:image/') || v.startsWith('data:video/')) ? v : ''
export function parseProject(input: unknown): Project {
  const p = obj(input),
    base = newProject()
  if (
    p.version !== 1 ||
    !Array.isArray(p.layers) ||
    p.layers.length > 100 ||
    !Number.isFinite(p.width) ||
    !Number.isFinite(p.height) ||
    p.width < 64 ||
    p.height < 64 ||
    p.width > 8192 ||
    p.height > 8192 ||
    p.width * p.height > 33_554_432
  )
    throw Error('This is not a supported OpenShot project')
  const b = obj(p.background),
    a = obj(p.animation),
    m = obj(p.watermark)
  const result: Project = {
    version: 1,
    name: str(p.name, 'Untitled', 120),
    width: Math.round(p.width),
    height: Math.round(p.height),
    background: {
      type: choice(
        b.type,
        ['gradient', 'solid', 'image', 'transparent', 'magic', 'mesh'],
        base.background.type,
      ),
      colors:
        Array.isArray(b.colors) &&
        !['#ff6534,#ff005f,#792eff', '#c4b5fd,#765bea,#352784'].includes(b.colors.join(','))
          ? b.colors.slice(0, 5).map((v: unknown) => color(v, '#7670b8'))
          : base.background.colors,
      angle: num(b.angle, 135, 0, 360),
      src: src(b.src),
      blur: num(b.blur, 0, 0, 100),
      noise: num(b.noise, 3, 0, 50),
      pattern: choice(b.pattern, ['none', 'grid', 'dots', 'lines'], 'none'),
      overlay: choice(b.overlay, ['none', 'window', 'leaves', 'diagonal'], 'none'),
      overlayOpacity: num(b.overlayOpacity, 20, 0, 100),
    },
    effects: {
      vfx: choice(
        obj(p.effects).vfx,
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
        ],
        'none',
      ),
      intensity: num(obj(p.effects).intensity, 50, 0, 100),
    },
    watermark: {
      text: str(m.text, '', 200),
      src: src(m.src),
      opacity: num(m.opacity, 0.8, 0, 1),
      size: num(m.size, 24, 8, 120),
      position: choice(
        m.position,
        ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'],
        'bottom-right',
      ),
    },
    animation: {
      duration: num(a.duration, 6, 0.5, 60),
      fps: num(a.fps, 30, 10, 60),
      easing: choice(
        a.easing,
        ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'],
        'ease-in-out',
      ),
      loop: typeof a.loop === 'boolean' ? a.loop : true,
      zoom: num(a.zoom, 1.35, 1, 3),
      focusX: num(a.focusX, 50, 0, 100),
      focusY: num(a.focusY, 50, 0, 100),
    },
    layers: p.layers.map((input: unknown) => {
      const v = obj(input),
        l = layer()
      l.id = uid()
      l.name = str(v.name, 'Layer', 120)
      l.kind = choice(v.kind, ['media', 'text', 'shape', 'code'], 'media')
      l.src = src(v.src)
      if (v.src === './sample.svg') {
        l.device = 'none'
        l.model = ''
      }
      l.mediaType = choice(v.mediaType, ['image', 'video'], 'image')
      for (const [key, min, max] of [
        ['x', -200, 300],
        ['y', -200, 300],
        ['width', 1, 200],
        ['height', 1, 200],
        ['scale', 0.01, 5],
        ['rotate', -360, 360],
        ['rotateX', -180, 180],
        ['rotateY', -180, 180],
        ['opacity', 0, 1],
        ['radius', 0, 500],
        ['shadow', 0, 100],
        ['shadowAngle', 0, 360],
        ['shadowDistance', 0, 120],
        ['reflection', 0, 100],
        ['padding', 0, 100],
        ['cropX', 0, 100],
        ['cropY', 0, 100],
        ['zoom', 0.5, 3],
        ['fontSize', 8, 500],
        ['brightness', 0, 200],
        ['contrast', 0, 200],
        ['saturation', 0, 200],
        ['blur', 0, 100],
        ['trimStart', 0, 86400],
        ['trimEnd', 0.01, 86400],
        ['speed', 0.1, 10],
      ] as const)
        (l as any)[key] = num(v[key], l[key], min, max)
      for (const key of [
        'flipX',
        'flipY',
        'hidden',
        'locked',
        'bold',
        'muted',
        'landscape',
        'displayOnly',
      ] as const)
        l[key] = typeof v[key] === 'boolean' ? v[key] : l[key]
      l.finish = typeof v.finish === 'string' && /^#[\da-f]{6}$/i.test(v.finish) ? v.finish : ''
      l.beats = Array.isArray(v.beats)
        ? v.beats.slice(0, 100).map((input: unknown) => {
            const b = obj(input),
              pose = obj(b.pose)
            return {
              id: uid(),
              time: num(b.time, 5, 0, 60),
              duration: num(b.duration, 1, 0.1, 20),
              pose: {
                x: num(pose.x, 50, -200, 300),
                y: num(pose.y, 50, -200, 300),
                scale: num(pose.scale, 1, 0.01, 5),
                rotate: num(pose.rotate, 0, -360, 360),
                rotateX: num(pose.rotateX, 0, -180, 180),
                rotateY: num(pose.rotateY, 0, -180, 180),
              },
            }
          })
        : []
      l.model = str(v.model, '', 80)
      l.device = choice(
        v.device,
        devices.map((d) => d.id),
        'none',
      )
      if (v.src === './sample.svg') {
        l.device = 'none'
        l.model = ''
        l.width = 75
        l.height = 75
      }
      l.style = choice(
        v.style,
        [
          'default',
          'glass-light',
          'glass-dark',
          'liquid',
          'inset-light',
          'inset-dark',
          'outline',
          'border',
          'retro',
          'card',
          'stack',
          'stack-2',
        ],
        'default',
      )
      l.shadowType = choice(v.shadowType, ['none', 'spread', 'hug', 'adaptive'], 'spread')
      l.frameColor = color(v.frameColor, l.frameColor)
      l.shadowColor = color(v.shadowColor, l.shadowColor)
      l.color = color(v.color, l.color)
      l.fit = choice(v.fit, ['cover', 'contain'], 'cover')
      l.text = str(v.text, '', 20000)
      l.fontFamily = str(v.fontFamily, l.fontFamily, 120)
      l.align = choice(v.align, ['left', 'center', 'right'], 'center')
      l.shape = choice(v.shape, ['circle', 'rectangle', 'ring', 'sphere', 'cube', 'arch'], 'sphere')
      l.filter = choice(
        v.filter,
        ['none', 'mono', 'warm', 'cool', 'vintage', 'vhs', 'glitch'],
        'none',
      )
      l.motion = choice(
        v.motion,
        motions.map((m) => m.id),
        'none',
      )
      l.url = str(v.url, '', 150)
      l.keyframes = Array.isArray(v.keyframes)
        ? v.keyframes
            .slice(0, 200)
            .map((v: unknown) => {
              const k = obj(v)
              return {
                id: uid(),
                time: num(k.time, 0, 0, 60),
                x: num(k.x, l.x, -200, 300),
                y: num(k.y, l.y, -200, 300),
                scale: num(k.scale, l.scale, 0.01, 5),
                rotate: num(k.rotate, l.rotate, -720, 720),
                rotateX: num(k.rotateX, l.rotateX, -360, 360),
                rotateY: num(k.rotateY, l.rotateY, -360, 360),
                opacity: num(k.opacity, l.opacity, 0, 1),
              }
            })
            .sort((a: any, b: any) => a.time - b.time)
        : []
      return l
    }),
  }
  if (!result.background.colors.length) result.background.colors = base.background.colors
  return result
}
