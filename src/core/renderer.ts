import type { Layer, Project } from './model'
import { animatedLayer } from './animation'
export type Media = HTMLImageElement | HTMLVideoElement
export class MediaStore {
  cache = new Map<string, Media>()
  pending = new Map<string, Promise<Media>>()
  async get(src: string, type: 'image' | 'video' = 'image'): Promise<Media> {
    if (this.cache.has(src)) return this.cache.get(src)!
    if (this.pending.has(src)) return this.pending.get(src)!
    const promise = new Promise<Media>((resolve, reject) => {
      const m = type === 'video' ? document.createElement('video') : new Image()
      if (m instanceof HTMLVideoElement) {
        m.muted = true
        m.playsInline = true
        m.preload = 'auto'
        m.onloadeddata = () => {
          this.cache.set(src, m)
          resolve(m)
        }
        m.onerror = () => reject(Error('This video format could not be opened'))
      } else {
        m.onload = () => {
          this.cache.set(src, m)
          resolve(m)
        }
        m.onerror = () => reject(Error('This image could not be opened'))
      }
      m.src = src
    }).finally(() => this.pending.delete(src))
    this.pending.set(src, promise)
    return promise
  }
  async prepare(p: Project) {
    await Promise.all([
      ...p.layers
        .filter((l) => l.src && l.kind === 'media')
        .map((l) => this.get(l.src, l.mediaType)),
      ...(p.background.src ? [this.get(p.background.src)] : []),
      ...(p.watermark.src ? [this.get(p.watermark.src)] : []),
    ])
  }
  async seek(p: Project, t: number, exact = true) {
    await Promise.all(
      p.layers
        .filter((l) => l.kind === 'media' && l.mediaType === 'video' && l.src)
        .map(async (l) => {
          const v = (await this.get(l.src, 'video')) as HTMLVideoElement
          const end = Math.min(l.trimEnd || v.duration, v.duration),
            start = Math.min(l.trimStart, end - 0.01),
            span = Math.max(0.01, end - start),
            target = Math.min(v.duration - 0.001, start + ((t * l.speed) % span))
          if (Math.abs(v.currentTime - target) > (exact ? 0.001 : 0.08)) {
            await new Promise<void>((resolve, reject) => {
              const done = () => {
                clearTimeout(timer)
                v.removeEventListener('seeked', done)
                resolve()
              }
              const timer = setTimeout(() => {
                v.removeEventListener('seeked', done)
                reject(Error('Video decoding timed out'))
              }, 15000)
              v.addEventListener('seeked', done)
              v.currentTime = target
            })
          }
        }),
    )
  }
  dispose() {
    for (const v of this.cache.values())
      if (v instanceof HTMLVideoElement) {
        v.pause()
        v.removeAttribute('src')
        v.load()
      }
    this.cache.clear()
  }
}
export const media = new MediaStore()
const rad = (d: number) => (d * Math.PI) / 180
export type Point = { x: number; y: number }
export function corners(l: Layer, w: number, h: number): Point[] {
  const lw = ((w * l.width) / 100) * l.scale,
    lh = ((h * l.height) / 100) * l.scale,
    rx = rad(l.rotateX),
    ry = rad(l.rotateY),
    rz = rad(l.rotate),
    perspective = Math.max(w, h) * 1.6
  return [
    [-lw / 2, -lh / 2],
    [lw / 2, -lh / 2],
    [lw / 2, lh / 2],
    [-lw / 2, lh / 2],
  ].map(([x, y]) => {
    const yy = y * Math.cos(rx),
      z = y * Math.sin(rx),
      xx = x * Math.cos(ry) + z * Math.sin(ry),
      zz = -x * Math.sin(ry) + z * Math.cos(ry),
      f = perspective / (perspective + zz)
    return {
      x: (l.x * w) / 100 + (xx * Math.cos(rz) - yy * Math.sin(rz)) * f,
      y: (l.y * h) / 100 + (xx * Math.sin(rz) + yy * Math.cos(rz)) * f,
    }
  })
}
function round(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, Math.max(0.01, w), Math.max(0.01, h), Math.max(0, Math.min(r, w / 2, h / 2)))
}
function cover(
  ctx: CanvasRenderingContext2D,
  m: Media,
  x: number,
  y: number,
  w: number,
  h: number,
  fit = 'cover',
  zoom = 1,
  cropX = 50,
  cropY = 50,
) {
  const sw = m instanceof HTMLVideoElement ? m.videoWidth : m.naturalWidth,
    sh = m instanceof HTMLVideoElement ? m.videoHeight : m.naturalHeight
  if (!sw || !sh) return
  const s = (fit === 'contain' ? Math.min(w / sw, h / sh) : Math.max(w / sw, h / sh)) * zoom,
    dw = sw * s,
    dh = sh * s
  ctx.drawImage(m, x + ((w - dw) * cropX) / 100, y + ((h - dh) * cropY) / 100, dw, dh)
}
function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 400,
  font = 'Arial',
) {
  ctx.fillStyle = color
  ctx.font = `${weight} ${size}px ${font}`
  ctx.fillText(str, x, y)
}
function dots(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ;['#ff6059', '#ffbd2e', '#28c840'].forEach((c, i) => {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(x + i * s * 1.65, y, s / 2, 0, Math.PI * 2)
    ctx.fill()
  })
}
const surfaces = new Map<string, HTMLCanvasElement>()
function surface(l: Layer, project: Project, ms: MediaStore): HTMLCanvasElement {
  const key = l.id,
    out = surfaces.get(key) || document.createElement('canvas')
  surfaces.set(key, out)
  const w = Math.max(8, Math.round((project.width * l.width) / 100)),
    h = Math.max(8, Math.round((project.height * l.height) / 100))
  if (out.width !== w) out.width = w
  if (out.height !== h) out.height = h
  const c = out.getContext('2d')!
  c.clearRect(0, 0, w, h)
  if (l.kind === 'text') {
    c.textAlign = l.align
    c.textBaseline = 'middle'
    c.fillStyle = l.color
    c.font = `${l.bold ? 700 : 400} ${l.fontSize}px ${l.fontFamily}`
    const words = l.text.split('\n'),
      lines: string[] = []
    for (const paragraph of words) {
      let current = ''
      for (const word of paragraph.split(' ')) {
        if (c.measureText(current + word).width > w - 12 && current) {
          lines.push(current.trim())
          current = ''
        }
        current += word + ' '
      }
      lines.push(current.trim())
    }
    lines.forEach((line, i) =>
      c.fillText(
        line,
        l.align === 'center' ? w / 2 : l.align === 'left' ? 6 : w - 6,
        h / 2 + (i - (lines.length - 1) / 2) * l.fontSize * 1.25,
      ),
    )
    return out
  }
  if (l.kind === 'code') {
    round(c, 0, 0, w, h, l.radius)
    c.fillStyle = l.frameColor
    c.fill()
    dots(c, 22, 22, 10)
    const lines = l.text.split('\n')
    c.textBaseline = 'top'
    const font = Math.max(10, l.fontSize)
    lines.forEach((line, i) => {
      if (50 + i * font * 1.6 > h) return
      text(c, String(i + 1), 18, 50 + i * font * 1.6, font, '#626b80', 400, 'monospace')
      let x = 52
      for (const token of line.split(
        /(\b(?:const|let|function|return|import|from|export|async|await|class|if|else|true|false|null)\b|"[^"]*"|'[^']*'|\/\/.*|\b\d+\b)/g,
      )) {
        const color = /^\/\//.test(token)
          ? '#737e94'
          : /^['"]/.test(token)
            ? '#b3dc9c'
            : /^(const|let|function|return|import|from|export|async|await|class|if|else)$/.test(
                  token,
                )
              ? '#c69ff1'
              : /^(true|false|null|\d+)$/.test(token)
                ? '#edb681'
                : '#d6dce8'
        text(c, token, x, 50 + i * font * 1.6, font, color, 400, 'monospace')
        x += c.measureText(token).width
      }
    })
    return out
  }
  if (l.kind === 'shape') {
    c.fillStyle = l.color
    if (l.shape === 'sphere') {
      const g = c.createRadialGradient(
        w * 0.3,
        h * 0.25,
        0,
        w * 0.5,
        h * 0.5,
        Math.min(w, h) * 0.55,
      )
      g.addColorStop(0, '#ffffff')
      g.addColorStop(0.3, l.color)
      g.addColorStop(1, '#151527')
      c.fillStyle = g
      c.beginPath()
      c.ellipse(w / 2, h / 2, w * 0.47, h * 0.47, 0, 0, Math.PI * 2)
      c.fill()
    } else if (l.shape === 'ring') {
      c.strokeStyle = l.color
      c.lineWidth = Math.min(w, h) * 0.16
      c.beginPath()
      c.ellipse(w / 2, h / 2, w * 0.36, h * 0.36, 0, 0, Math.PI * 2)
      c.stroke()
    } else if (l.shape === 'circle') {
      c.beginPath()
      c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
      c.fill()
    } else if (l.shape === 'cube') {
      c.beginPath()
      c.moveTo(w * 0.5, 0)
      c.lineTo(w, h * 0.25)
      c.lineTo(w, h * 0.75)
      c.lineTo(w * 0.5, h)
      c.lineTo(0, h * 0.75)
      c.lineTo(0, h * 0.25)
      c.closePath()
      c.fill()
      c.fillStyle = '#ffffff44'
      c.beginPath()
      c.moveTo(0, h * 0.25)
      c.lineTo(w * 0.5, 0)
      c.lineTo(w, h * 0.25)
      c.lineTo(w * 0.5, h * 0.5)
      c.fill()
      c.fillStyle = '#00000033'
      c.beginPath()
      c.moveTo(w * 0.5, h * 0.5)
      c.lineTo(w, h * 0.25)
      c.lineTo(w, h * 0.75)
      c.lineTo(w * 0.5, h)
      c.fill()
    } else {
      round(c, 0, 0, w, h, l.shape === 'arch' ? w / 2 : l.radius)
      c.fill()
    }
    return out
  }
  let x = 0,
    y = 0,
    sw = w,
    sh = h,
    rr = l.radius
  const d = l.device,
    unit = Math.min(w, h),
    bezel = Math.max(4, unit * 0.027),
    header = Math.max(24, w * 0.038)
  const dark = !['#ffffff', '#f1f3f5', '#e5e7eb'].includes(l.frameColor)
  c.fillStyle = l.frameColor
  if (d === 'iphone' || d === 'android' || d === 'tablet' || d === 'watch') {
    const watch = d === 'watch'
    rr = unit * (watch ? 0.24 : 0.13)
    if (watch) {
      c.fillStyle = l.frameColor
      round(c, w * 0.24, 0, w * 0.52, h, h * 0.07)
      c.fill()
      x = w * 0.06
      y = h * 0.14
      sw = w * 0.88
      sh = h * 0.72
      c.fillStyle = '#999'
      round(c, w * 0.92, h * 0.36, w * 0.07, h * 0.13, w * 0.02)
      c.fill()
    } else {
      x = 0
      y = 0
      sw = w
      sh = h
    }
    const frame = c.createLinearGradient(x, 0, x + sw, h)
    frame.addColorStop(0, '#898c93')
    frame.addColorStop(0.12, l.frameColor)
    frame.addColorStop(0.85, l.frameColor)
    frame.addColorStop(1, '#a5a5a9')
    c.fillStyle = frame
    round(c, x, y, sw, sh, rr)
    c.fill()
    x += bezel
    y += bezel
    sw -= bezel * 2
    sh -= bezel * 2
    rr -= bezel * 0.6
  } else if (d === 'laptop' || d === 'desktop') {
    const screenH = d === 'laptop' ? h * 0.91 : h * 0.79
    c.fillStyle = l.frameColor
    round(c, 0, 0, w, screenH, unit * 0.025)
    c.fill()
    x = bezel
    y = bezel
    sw = w - 2 * bezel
    sh = screenH - 2 * bezel
    rr = 4
    if (d === 'laptop') {
      const g = c.createLinearGradient(0, h * 0.9, 0, h)
      g.addColorStop(0, '#e2e4e8')
      g.addColorStop(0.45, '#b4b8be')
      g.addColorStop(1, '#73777f')
      c.fillStyle = g
      round(c, 0, h * 0.91, w, h * 0.09, unit * 0.03)
      c.fill()
      c.fillStyle = '#777b83'
      round(c, w * 0.41, h * 0.91, w * 0.18, h * 0.022, unit * 0.01)
      c.fill()
    } else {
      const g = c.createLinearGradient(0, h * 0.77, 0, h)
      g.addColorStop(0, '#d3d5da')
      g.addColorStop(1, '#9a9da3')
      c.fillStyle = g
      round(c, 0, h * 0.75, w, h * 0.09, unit * 0.012)
      c.fill()
      c.fillRect(w * 0.45, h * 0.82, w * 0.1, h * 0.13)
      round(c, w * 0.31, h * 0.94, w * 0.38, h * 0.05, unit * 0.02)
      c.fill()
    }
  } else if (['browser', 'safari', 'arc', 'macos', 'windows'].includes(d)) {
    round(c, 0, 0, w, h, rr)
    c.fillStyle = l.frameColor
    c.fill()
    y = header
    sh = h - header
    if (d === 'arc') {
      x = w * 0.14
      sw = w - x
      y = 8
      sh = h - 16
      dots(c, 16, 18, 7)
      c.fillStyle = dark ? '#ffffff16' : '#00000012'
      round(c, 10, 48, x - 20, 20, 6)
      c.fill()
      round(c, 10, 78, x - 20, 9, 4)
      c.fill()
      round(c, 10, 100, x - 30, 9, 4)
      c.fill()
    } else if (d === 'windows') {
      text(c, '−   □   ×', w - header * 2.6, header * 0.7, header * 0.45, dark ? '#d9dbe2' : '#333')
    } else {
      dots(c, header * 0.55, header * 0.51, header * 0.24)
      if (d === 'browser' || d === 'safari') {
        c.fillStyle = dark ? '#ffffff12' : '#0000000c'
        round(c, w * 0.24, header * 0.21, w * 0.54, header * 0.57, header * 0.14)
        c.fill()
        c.textAlign = 'center'
        text(c, l.url, w * 0.51, header * 0.6, header * 0.3, dark ? '#a5a8b4' : '#5d6370')
        c.textAlign = 'left'
      }
    }
  } else if (d === 'polaroid') {
    c.fillStyle = '#faf9f5'
    c.fillRect(0, 0, w, h)
    x = w * 0.045
    y = x
    sw = w - x * 2
    sh = h - w * 0.18
    rr = 0
  }
  if (l.style !== 'default') {
    const border = l.style.includes('inset') ? l.padding : Math.max(3, l.padding),
      light = l.style.includes('light') || l.style === 'liquid'
    c.save()
    c.globalAlpha = l.style === 'outline' ? 0.9 : 0.5
    c.fillStyle = l.style === 'border' ? l.frameColor : light ? '#ffffff' : '#111116'
    round(c, x, y, sw, sh, rr)
    c.fill()
    c.restore()
    x += border
    y += border
    sw -= border * 2
    sh -= border * 2
    rr = Math.max(0, rr - border * 0.3)
  }
  const m = ms.cache.get(l.src)
  c.save()
  round(c, x, y, sw, sh, rr)
  c.clip()
  c.fillStyle = '#161820'
  c.fillRect(x, y, sw, sh)
  const filters = [
    `brightness(${l.brightness}%)`,
    `contrast(${l.contrast}%)`,
    `saturate(${l.saturation}%)`,
    `blur(${l.blur}px)`,
  ]
  if (l.filter === 'mono') filters.push('grayscale(1)')
  if (l.filter === 'warm') filters.push('sepia(.25) saturate(1.2)')
  if (l.filter === 'cool') filters.push('hue-rotate(15deg) saturate(.8)')
  if (l.filter === 'vintage') filters.push('sepia(.5) contrast(.8)')
  c.filter = filters.join(' ')
  c.translate(x + sw / 2, y + sh / 2)
  c.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1)
  if (m) cover(c, m, -sw / 2, -sh / 2, sw, sh, l.fit, l.zoom, l.cropX, l.cropY)
  c.restore()
  if (l.filter === 'vhs') {
    c.save()
    round(c, x, y, sw, sh, rr)
    c.clip()
    c.fillStyle = '#00000018'
    for (let yy = y; yy < y + sh; yy += 4) c.fillRect(x, yy, sw, 1)
    c.fillStyle = '#ff99aa0b'
    c.fillRect(x, y, sw, sh)
    c.restore()
  }
  if (l.filter === 'glitch' && m) {
    c.save()
    round(c, x, y, sw, sh, rr)
    c.clip()
    c.globalAlpha = 0.35
    c.globalCompositeOperation = 'screen'
    c.fillStyle = '#fe2b7188'
    for (let i = 0; i < 8; i++)
      c.fillRect(x + (i % 2 ? 0 : sw * 0.3), y + sh * (i * 0.113 + 0.04), sw * 0.5, sh * 0.008)
    c.restore()
  }
  if (d === 'iphone') {
    c.save()
    if (l.landscape) {
      c.translate(0, h)
      c.rotate(-Math.PI / 2)
    }
    const pw = l.landscape ? h : w,
      ph = l.landscape ? w : h
    c.fillStyle = '#07080a'
    if (l.model.includes('SE')) {
      c.beginPath()
      c.arc(pw / 2, ph - bezel * 2, bezel * 0.95, 0, Math.PI * 2)
      c.fill()
    } else {
      const notch = /iPhone 1[234]/.test(l.model)
      round(
        c,
        pw * (notch ? 0.26 : 0.35),
        notch ? bezel * 0.7 : bezel * 1.8,
        pw * (notch ? 0.48 : 0.3),
        bezel * (notch ? 2.8 : 1.7),
        bezel,
      )
      c.fill()
      c.fillStyle = '#ffffff88'
      round(c, pw * 0.35, ph - bezel * 2.8, pw * 0.3, bezel * 0.35, 2)
      c.fill()
    }
    c.restore()
  }
  if (d === 'android') {
    c.fillStyle = '#07080a'
    c.beginPath()
    c.arc(l.model.includes('S10') ? w * 0.85 : w / 2, bezel * 2.4, bezel * 0.6, 0, Math.PI * 2)
    c.fill()
  }
  return out
}
function path(c: CanvasRenderingContext2D, pts: Point[]) {
  c.beginPath()
  pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)))
  c.closePath()
}
function triangle(c: CanvasRenderingContext2D, img: HTMLCanvasElement, s: Point[], d: Point[]) {
  const [a, b, e] = s,
    [p, q, r] = d,
    den = a.x * (b.y - e.y) + b.x * (e.y - a.y) + e.x * (a.y - b.y)
  if (Math.abs(den) < 0.001) return
  const af = (p.x * (b.y - e.y) + q.x * (e.y - a.y) + r.x * (a.y - b.y)) / den,
    bf = (p.y * (b.y - e.y) + q.y * (e.y - a.y) + r.y * (a.y - b.y)) / den,
    cf = (p.x * (e.x - b.x) + q.x * (a.x - e.x) + r.x * (b.x - a.x)) / den,
    df = (p.y * (e.x - b.x) + q.y * (a.x - e.x) + r.y * (b.x - a.x)) / den,
    ef =
      (p.x * (b.x * e.y - e.x * b.y) +
        q.x * (e.x * a.y - a.x * e.y) +
        r.x * (a.x * b.y - b.x * a.y)) /
      den,
    ff =
      (p.y * (b.x * e.y - e.x * b.y) +
        q.y * (e.x * a.y - a.x * e.y) +
        r.y * (a.x * b.y - b.x * a.y)) /
      den
  const center = { x: (p.x + q.x + r.x) / 3, y: (p.y + q.y + r.y) / 3 },
    expanded = d.map((v) => {
      const dx = v.x - center.x,
        dy = v.y - center.y,
        distance = Math.hypot(dx, dy)
      return { x: v.x + (dx / distance) * 1.5, y: v.y + (dy / distance) * 1.5 }
    })
  c.save()
  path(c, expanded)
  c.clip()
  c.transform(af, bf, cf, df, ef, ff)
  c.drawImage(img, 0, 0)
  c.restore()
}
function projectQuad(
  c: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  pts: Point[],
  subdivisions = 8,
) {
  c.save()
  path(c, pts)
  c.clip()
  const at = (u: number, v: number) => ({
    x:
      pts[0].x * (1 - u) * (1 - v) +
      pts[1].x * u * (1 - v) +
      pts[2].x * u * v +
      pts[3].x * (1 - u) * v,
    y:
      pts[0].y * (1 - u) * (1 - v) +
      pts[1].y * u * (1 - v) +
      pts[2].y * u * v +
      pts[3].y * (1 - u) * v,
  })
  for (let y = 0; y < subdivisions; y++)
    for (let x = 0; x < subdivisions; x++) {
      const u = x / subdivisions,
        v = y / subdivisions,
        U = (x + 1) / subdivisions,
        V = (y + 1) / subdivisions,
        src = [
          { x: u * img.width, y: v * img.height },
          { x: U * img.width, y: v * img.height },
          { x: U * img.width, y: V * img.height },
          { x: u * img.width, y: V * img.height },
        ],
        dst = [at(u, v), at(U, v), at(U, V), at(u, V)]
      triangle(c, img, [src[0], src[1], src[2]], [dst[0], dst[1], dst[2]])
      triangle(c, img, [src[0], src[2], src[3]], [dst[0], dst[2], dst[3]])
    }
  c.restore()
}
let noiseCanvas: HTMLCanvasElement | undefined
function noise(c: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  if (!noiseCanvas) {
    noiseCanvas = document.createElement('canvas')
    noiseCanvas.width = 256
    noiseCanvas.height = 256
    const ctx = noiseCanvas.getContext('2d')!,
      data = ctx.createImageData(256, 256)
    let seed = 42
    for (let i = 0; i < data.data.length; i += 4) {
      seed = (1664525 * seed + 1013904223) >>> 0
      const v = seed >>> 24
      data.data.set([v, v, v, 255], i)
    }
    ctx.putImageData(data, 0, 0)
  }
  c.save()
  c.globalAlpha = strength / 100
  c.globalCompositeOperation = 'soft-light'
  c.fillStyle = c.createPattern(noiseCanvas, 'repeat')!
  c.fillRect(0, 0, w, h)
  c.restore()
}
export function palette(m: Media): string[] {
  const cv = document.createElement('canvas')
  cv.width = 8
  cv.height = 8
  const c = cv.getContext('2d')!
  c.drawImage(m, 0, 0, 8, 8)
  const d = c.getImageData(0, 0, 8, 8).data
  return [10, 26, 42].map(
    (i) =>
      `#${[d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]
        .map((v) =>
          Math.min(240, Math.max(35, v + 25))
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')}`,
  )
}
export function render(
  c: CanvasRenderingContext2D,
  p: Project,
  t = 0,
  ms = media,
  performance = false,
) {
  const w = p.width,
    h = p.height,
    bg = p.background
  c.save()
  c.clearRect(0, 0, w, h)
  if (bg.type !== 'transparent') {
    const colors = bg.colors.length ? bg.colors : ['#eeeeee', '#bbbbbb']
    const angle = rad(bg.angle),
      cx = w / 2,
      cy = h / 2,
      r = Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle)),
      g = c.createLinearGradient(
        cx - (Math.sin(angle) * r) / 2,
        cy - (Math.cos(angle) * r) / 2,
        cx + (Math.sin(angle) * r) / 2,
        cy + (Math.cos(angle) * r) / 2,
      )
    colors.forEach((v, i) => g.addColorStop(i / Math.max(1, colors.length - 1), v))
    c.fillStyle = bg.type === 'solid' ? colors[0] : g
    c.fillRect(0, 0, w, h)
    if (bg.type === 'image' && ms.cache.has(bg.src)) {
      c.save()
      c.filter = `blur(${bg.blur}px)`
      cover(c, ms.cache.get(bg.src)!, -bg.blur * 2, -bg.blur * 2, w + bg.blur * 4, h + bg.blur * 4)
      c.restore()
    }
    if (bg.type === 'magic') {
      const l = p.layers.find((l) => l.kind === 'media' && l.src),
        m = l && ms.cache.get(l.src)
      if (m) {
        c.save()
        c.filter = `blur(${Math.max(40, bg.blur)}px) saturate(1.6)`
        cover(c, m, -w * 0.2, -h * 0.2, w * 1.4, h * 1.4)
        c.restore()
        c.fillStyle = '#00000018'
        c.fillRect(0, 0, w, h)
      }
    }
    if (bg.type === 'mesh') {
      colors.forEach((color, i) => {
        const x = w * (0.2 + 0.3 * i) + Math.sin(t * 0.7 + i) * w * 0.12,
          y = h * (0.3 + (i % 2) * 0.5),
          gr = c.createRadialGradient(x, y, 0, x, y, w * 0.7)
        gr.addColorStop(0, color)
        gr.addColorStop(1, color + '00')
        c.fillStyle = gr
        c.fillRect(0, 0, w, h)
      })
    }
    if (bg.pattern !== 'none') {
      c.save()
      c.strokeStyle = '#ffffff22'
      c.fillStyle = '#ffffff33'
      c.lineWidth = 1
      for (let x = 0; x < w; x += 32)
        for (let y = 0; y < h; y += 32) {
          if (bg.pattern === 'dots') {
            c.beginPath()
            c.arc(x, y, 1.5, 0, Math.PI * 2)
            c.fill()
          } else if (bg.pattern === 'grid') {
            c.strokeRect(x, y, 32, 32)
          } else {
            c.beginPath()
            c.moveTo(x, y)
            c.lineTo(x + 32, y + 32)
            c.stroke()
          }
        }
      c.restore()
    }
    if (bg.overlay !== 'none') {
      c.save()
      c.globalAlpha = bg.overlayOpacity / 100
      c.fillStyle = '#000000'
      c.filter = `blur(${w * 0.008}px)`
      if (bg.overlay === 'window') {
        c.translate(w * 0.15, -h * 0.1)
        c.rotate(0.3)
        for (let x = 0; x < 4; x++)
          for (let y = 0; y < 3; y++) c.fillRect(x * w * 0.26, y * h * 0.45, w * 0.2, h * 0.35)
      } else if (bg.overlay === 'diagonal') {
        c.rotate(-0.5)
        for (let i = -4; i < 12; i++) c.fillRect(i * w * 0.15, -h, w * 0.055, h * 4)
      } else {
        for (let i = 0; i < 13; i++) {
          c.beginPath()
          c.ellipse(
            w * (0.08 + i * 0.075),
            h * (0.1 + Math.sin(i) * 0.12),
            w * 0.16,
            h * 0.035,
            -0.5 + i * 0.1,
            0,
            Math.PI * 2,
          )
          c.fill()
        }
      }
      c.restore()
    }
    if (bg.noise && !performance) noise(c, w, h, bg.noise)
  }
  for (const original of p.layers) {
    if (original.hidden) continue
    const l = animatedLayer(original, p, t)
    if (l.opacity <= 0 || l.scale <= 0) continue
    c.save()
    c.globalAlpha = l.opacity
    const pts = corners(l, w, h),
      img = surface(l, p, ms)
    if (l.shadow && l.shadowType !== 'none') {
      c.save()
      c.globalAlpha *= (l.shadow / 100) * 0.65
      c.filter = `blur(${l.shadowType === 'hug' ? w * 0.01 : w * 0.025}px)`
      c.translate(
        Math.cos(rad(l.shadowAngle)) * w * 0.015,
        Math.sin(rad(l.shadowAngle)) * w * 0.022,
      )
      c.fillStyle =
        l.shadowType === 'adaptive' && p.background.colors[0]
          ? p.background.colors.at(-1)!
          : l.shadowColor
      path(c, pts)
      c.fill()
      c.restore()
    }
    if (l.rotateX === 0 && l.rotateY === 0) {
      c.save()
      c.translate((l.x * w) / 100, (l.y * h) / 100)
      c.rotate(rad(l.rotate))
      const dw = ((w * l.width) / 100) * l.scale,
        dh = ((h * l.height) / 100) * l.scale
      c.drawImage(img, -dw / 2, -dh / 2, dw, dh)
      if (l.reflection) {
        c.save()
        c.globalAlpha *= l.reflection / 100
        c.translate(0, dh)
        c.scale(1, -1)
        c.drawImage(img, -dw / 2, -dh / 2, dw, dh)
        c.restore()
      }
      c.restore()
    } else {
      projectQuad(c, img, pts, performance ? 4 : 10)
      if (l.reflection) {
        const baseline = Math.max(...pts.map((a) => a.y)),
          reflection = pts.map((a) => ({ x: a.x, y: baseline + (baseline - a.y) * 0.65 }))
        c.globalAlpha *= l.reflection / 100
        projectQuad(c, img, reflection, 4)
      }
    }
    c.restore()
  }
  const wm = p.watermark
  if (wm.text || wm.src) {
    c.save()
    c.globalAlpha = wm.opacity
    const right = wm.position.includes('right'),
      bottom = wm.position.includes('bottom'),
      center = wm.position === 'center',
      margin = w * 0.03,
      x = center ? w / 2 : right ? w - margin : margin,
      y = center ? h / 2 : bottom ? h - margin : margin
    c.textAlign = center ? 'center' : right ? 'right' : 'left'
    c.textBaseline = bottom ? 'bottom' : 'top'
    text(c, wm.text, x, y, wm.size, '#ffffff', 600)
    const m = ms.cache.get(wm.src)
    if (m) {
      const iw = wm.size * 4,
        ih = wm.size * 2
      c.drawImage(m, right ? x - iw : x, bottom ? y - ih : y, iw, ih)
    }
    c.restore()
  }
  c.restore()
  // Discard canvases for layers removed from the document.
  for (const key of surfaces.keys()) if (!p.layers.some((l) => l.id === key)) surfaces.delete(key)
}
export function hitLayer(p: Project, x: number, y: number, t = 0): Layer | undefined {
  return [...p.layers].reverse().find((l) => {
    if (l.hidden || l.locked) return false
    const pts = corners(animatedLayer(l, p, t), p.width, p.height)
    let inside = false
    for (let i = 0, j = 3; i < 4; j = i++) {
      const a = pts[i],
        b = pts[j]
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside
    }
    return inside
  })
}
