import { describe, it, expect } from 'vitest'
import { newProject, layer, applyTemplate, templates } from '../src/core/model'
import { animatedLayer, interpolate, ease } from '../src/core/animation'
import { corners, hitLayer } from '../src/core/renderer'
import { parseProject } from '../src/core/validation'
import { outputSize } from '../src/core/export'
describe('project geometry', () => {
  it('centers and scales the screen in canvas coordinates', () => {
    const p = newProject(),
      l = layer({ width: 50, height: 50 })
    expect(corners(l, p.width, p.height)).toEqual([
      { x: 400, y: 300 },
      { x: 1200, y: 300 },
      { x: 1200, y: 900 },
      { x: 400, y: 900 },
    ])
  })
  it('selects the top visible unlocked layer', () => {
    const p = newProject(),
      top = layer({ name: 'Top' })
    p.layers.push(top)
    expect(hitLayer(p, 800, 600)?.name).toBe('Top')
    top.hidden = true
    expect(hitLayer(p, 800, 600)?.name).toBe('Screenshot')
    top.hidden = false
    top.locked = true
    expect(hitLayer(p, 800, 600)?.name).toBe('Screenshot')
    expect(hitLayer(p, 0, 0)).toBeUndefined()
  })
  it('creates finite coordinates for tilted layers', () => {
    for (const x of [-70, 0, 70])
      for (const y of [-70, 0, 70])
        expect(
          corners(layer({ rotateX: x, rotateY: y }), 1600, 1200).every(
            (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
          ),
        ).toBe(true)
  })
  it('preserves media when applying every template', () => {
    const p = newProject()
    p.layers[0].src = 'data:image/png;base64,example'
    for (let i = 0; i < templates.length; i++) {
      const next = applyTemplate(p, i)
      expect(
        next.layers.filter((l) => l.kind === 'media').every((l) => l.src === p.layers[0].src),
      ).toBe(true)
      expect(new Set(next.layers.map((l) => l.id)).size).toBe(next.layers.length)
    }
  })
})
describe('animation', () => {
  const a = {
      id: 'a',
      time: 0,
      x: 20,
      y: 50,
      scale: 1,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      opacity: 1,
    },
    b = { ...a, id: 'b', time: 6, x: 80, scale: 2 }
  it('interpolates independent of frame insertion order', () => {
    expect(interpolate([b, a], 3, 'linear')).toMatchObject({ x: 50, scale: 1.5 })
    expect(interpolate([b, a], -1, 'linear')).toMatchObject({ x: 20 })
    expect(interpolate([b, a], 9, 'linear')).toMatchObject({ x: 80 })
  })
  it('never replaces layer identity with keyframe identity', () => {
    const p = newProject(),
      l = layer({ keyframes: [a, b] })
    expect(animatedLayer(l, p, 0).id).toBe(l.id)
    expect(animatedLayer(l, p, 6).id).toBe(l.id)
  })
  it('applies zoom, pan, and opacity presets at predictable times', () => {
    const p = newProject()
    expect(animatedLayer(layer({ motion: 'pan-left' }), p, 3).x).toBe(50)
    expect(animatedLayer(layer({ motion: 'fade' }), p, 0).opacity).toBe(0)
    expect(animatedLayer(layer({ motion: 'zoom-in' }), p, 6).scale).toBeCloseTo(1.2)
  })
  it('clamps easing at both endpoints', () => {
    for (const mode of ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'] as const) {
      expect(ease(-1, mode)).toBe(0)
      expect(ease(2, mode)).toBe(1)
    }
  })
})
describe('file validation and output limits', () => {
  it('rejects invalid projects and impossible canvas allocations', () => {
    for (const v of [
      null,
      {},
      { ...newProject(), version: 2 },
      { ...newProject(), width: 99999 },
      { ...newProject(), width: 8192, height: 8192 },
    ])
      expect(() => parseProject(v)).toThrow()
  })
  it('normalizes imported geometry and blocks remote media', () => {
    const p = newProject()
    Object.assign(p.layers[0], {
      src: 'https://example.com/private.png',
      x: Infinity,
      opacity: 5,
      style: 'bogus',
      keyframes: [{ time: NaN, x: NaN }],
    })
    const safe = parseProject(p)
    expect(safe.layers[0]).toMatchObject({ src: '', x: 50, opacity: 1, style: 'default' })
    expect(safe.layers[0].keyframes[0].time).toBe(0)
  })
  it('retains embedded media and regenerates unique layer IDs', () => {
    const p = newProject()
    p.layers[0].src = 'data:image/png;base64,test'
    p.layers.push({ ...p.layers[0] })
    const safe = parseProject(p)
    expect(safe.layers[0].src).toBe(p.layers[0].src)
    expect(safe.layers[0].id).not.toBe(safe.layers[1].id)
  })
  it('checks scaled dimensions before allocating export canvases', () => {
    expect(outputSize(newProject(), 2)).toEqual({ width: 3200, height: 2400 })
    expect(() => outputSize(newProject(), 8)).toThrow()
  })
})
