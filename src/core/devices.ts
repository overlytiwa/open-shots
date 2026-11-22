import type { Device, Layer } from './model'
export interface DeviceAsset {
  id: string
  name: string
  device: Device
  file: string
  rotation: [number, number, number]
  screenMaterial?: string
  screenMesh?: string
  hide?: string[]
  body?: string[]
  ratio: number
  display: [number, number]
  year?: number
  author: string
  authorUrl?: string
  source: string
  license: 'CC-BY-4.0' | 'CC0-1.0'
  island?: boolean
}
export const deviceAssets: DeviceAsset[] = [
  {
    id: 'iphone-17-pro-max',
    name: 'iPhone 17 Pro Max',
    device: 'iphone',
    file: 'iphone-17-pro-max.glb',
    rotation: [0, Math.PI / 2, 0],
    screenMaterial: 'screen.001',
    body: ['basecolor.001', 'metalframe.002', 'backpanel.001'],
    ratio: 440 / 956,
    display: [1320, 2868],
    year: 2025,
    author: 'MajdyModels',
    authorUrl: 'https://sketchfab.com/MG990',
    source: 'https://sketchfab.com/3d-models/iphone-17-pro-max-87fc1df741384124a8ce0226d2b2058d',
    license: 'CC-BY-4.0',
    island: true,
  },
  {
    id: 'iphone-12-pro',
    name: 'iPhone 12 Pro',
    device: 'iphone',
    file: 'iphone-12-pro.glb',
    rotation: [0, 0, 0],
    screenMaterial: 'Wallpaper',
    body: ['Body', 'BodyFrame', 'PacificBlue'],
    ratio: 1170 / 2532,
    display: [1170, 2532],
    year: 2020,
    author: 'DatSketch',
    authorUrl: 'https://sketchfab.com/DatSketch',
    source: 'https://sketchfab.com/3d-models/iphone-12-pro-05dfc991665e45c68c8b7062136c0c6e',
    license: 'CC-BY-4.0',
  },
  {
    id: 'galaxy-s21-ultra',
    name: 'Galaxy S21 Ultra',
    device: 'android',
    file: 'galaxy-s21-ultra.glb',
    rotation: [0, Math.PI, 0],
    screenMaterial: 'Screen',
    body: ['Back'],
    ratio: 1440 / 3200,
    display: [1440, 3200],
    year: 2021,
    author: 'DatSketch',
    authorUrl: 'https://sketchfab.com/DatSketch',
    source:
      'https://sketchfab.com/3d-models/samsung-galaxy-s21-ultra-cd962832be7744efb6b37fe0ee2027e7',
    license: 'CC-BY-4.0',
  },
  {
    id: 'ipad-mini-6',
    name: 'iPad mini 6',
    device: 'tablet',
    file: 'ipad-mini-6.glb',
    rotation: [0, Math.PI, 0],
    screenMaterial: 'Screen',
    ratio: 1488 / 2266,
    display: [1488, 2266],
    year: 2021,
    author: 'DatSketch',
    authorUrl: 'https://sketchfab.com/DatSketch',
    source: 'https://sketchfab.com/3d-models/ipad-mini-6-2021-f363c2b1c74a462588db184bd4fb024e',
    license: 'CC-BY-4.0',
  },
  {
    id: 'macbook-pro-16',
    name: 'MacBook Pro 16-inch',
    device: 'laptop',
    file: 'macbook-pro-16.glb',
    rotation: [0, 0, 0],
    screenMaterial: 'sfCQkHOWyrsLmor',
    ratio: 1.55,
    display: [3456, 2234],
    year: 2024,
    author: 'jackbaeten',
    authorUrl: 'https://sketchfab.com/jackbaeten',
    source:
      'https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4',
    license: 'CC-BY-4.0',
  },
  {
    id: 'desktop-monitor',
    name: 'Desktop monitor',
    device: 'desktop',
    file: 'desktop-monitor.glb',
    rotation: [0, 0, 0],
    screenMesh: 'screen',
    ratio: 1.55,
    display: [2560, 1440],
    author: 'tevy.dev',
    source: 'https://tevy.dev/models/desktop-monitor',
    license: 'CC0-1.0',
  },
  {
    id: 'apple-watch-series-7',
    name: 'Apple Watch Series 7',
    device: 'watch',
    file: 'apple-watch-series-7.glb',
    rotation: [0.5193880746836843, 0, 0],
    screenMesh: 'Object_27',
    hide: ['Glass_8'],
    ratio: 0.73,
    display: [396, 484],
    year: 2021,
    author: 'SDC PERFORMANCE',
    source:
      'https://sketchfab.com/3d-models/apple-watch-series-7-free-watch-face-sdctm-cf15ecbf159f42a28df5e56bdfa666bb',
    license: 'CC-BY-4.0',
  },
]
export function deviceAsset(l: Pick<Layer, 'device' | 'model'>): DeviceAsset | undefined {
  if (!['iphone', 'android', 'tablet', 'laptop', 'desktop', 'watch'].includes(l.device)) return
  return (
    deviceAssets.find((a) => a.id === l.model || a.name === l.model) ||
    deviceAssets.find((a) => a.device === l.device)
  )
}
export function deviceCredits(layers: Layer[]): string {
  const assets = [
    ...new Map(
      layers
        .filter((l) => !l.hidden && !l.displayOnly && l.src && l.kind === 'media')
        .map((l) => deviceAsset(l))
        .filter((a): a is DeviceAsset => !!a)
        .map((a) => [a.id, a]),
    ).values(),
  ]
  if (!assets.some((a) => a.license === 'CC-BY-4.0')) return ''
  return (
    'Device model credits\n\n' +
    assets
      .map(
        (a) =>
          `${a.name}\nAuthor: ${a.author}${a.authorUrl ? ' (' + a.authorUrl + ')' : ''}\nSource: ${a.source}\nLicense: ${a.license} (${a.license === 'CC-BY-4.0' ? 'https://creativecommons.org/licenses/by/4.0/' : 'https://creativecommons.org/publicdomain/zero/1.0/'})\nChanges: screen media replaced, orientation and scale normalized, optional material finish adjusted; rendered with OpenShot.\n`,
      )
      .join('\n') +
    '\nKeep these credits with published renders using CC BY models.\n'
  )
}
