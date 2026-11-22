export type Device =
  | 'none'
  | 'browser'
  | 'safari'
  | 'arc'
  | 'macos'
  | 'windows'
  | 'iphone'
  | 'android'
  | 'tablet'
  | 'laptop'
  | 'desktop'
  | 'watch'
  | 'polaroid'
export type FrameStyle =
  | 'default'
  | 'glass-light'
  | 'glass-dark'
  | 'liquid'
  | 'inset-light'
  | 'inset-dark'
  | 'outline'
  | 'border'
export type Motion =
  | 'none'
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down'
  | 'float'
  | 'orbit'
  | 'reveal'
  | 'fade'
  | 'spin'
  | 'swing'
  | 'parallax'
  | 'bounce'
  | 'flip-x'
  | 'flip-y'
  | 'rise'
  | 'drop'
  | 'pulse'
  | 'rock'
  | 'slide-left'
  | 'slide-right'
  | 'depth'
  | 'focus'
export interface Keyframe {
  id: string
  time: number
  x: number
  y: number
  scale: number
  rotate: number
  rotateX: number
  rotateY: number
  opacity: number
}
export interface Layer {
  id: string
  name: string
  kind: 'media' | 'text' | 'shape' | 'code'
  src: string
  mediaType: 'image' | 'video'
  x: number
  y: number
  width: number
  height: number
  scale: number
  rotate: number
  rotateX: number
  rotateY: number
  opacity: number
  radius: number
  shadow: number
  shadowType: 'none' | 'spread' | 'hug' | 'adaptive'
  shadowAngle: number
  shadowColor: string
  device: Device
  model: string
  landscape: boolean
  style: FrameStyle
  frameColor: string
  fit: 'cover' | 'contain'
  cropX: number
  cropY: number
  zoom: number
  flipX: boolean
  flipY: boolean
  hidden: boolean
  locked: boolean
  reflection: number
  padding: number
  text: string
  color: string
  fontSize: number
  fontFamily: string
  align: 'left' | 'center' | 'right'
  bold: boolean
  shape: 'circle' | 'rectangle' | 'ring' | 'sphere' | 'cube' | 'arch'
  filter: 'none' | 'mono' | 'warm' | 'cool' | 'vintage' | 'vhs' | 'glitch'
  brightness: number
  contrast: number
  saturation: number
  blur: number
  motion: Motion
  keyframes: Keyframe[]
  trimStart: number
  trimEnd: number
  speed: number
  muted: boolean
  url: string
}
export interface Project {
  version: 1
  name: string
  width: number
  height: number
  layers: Layer[]
  background: {
    type: 'gradient' | 'solid' | 'image' | 'transparent' | 'magic' | 'mesh'
    colors: string[]
    angle: number
    src: string
    blur: number
    noise: number
    pattern: 'none' | 'grid' | 'dots' | 'lines'
    overlay: 'none' | 'window' | 'leaves' | 'diagonal'
    overlayOpacity: number
  }
  watermark: {
    text: string
    src: string
    opacity: number
    size: number
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'
  }
  animation: {
    duration: number
    fps: number
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring'
    loop: boolean
    zoom: number
    focusX: number
    focusY: number
  }
}
export const uid = () => crypto.randomUUID()
export const layer = (values: Partial<Layer> = {}): Layer => ({
  id: uid(),
  name: 'Screenshot',
  kind: 'media',
  src: './sample.svg',
  mediaType: 'image',
  x: 50,
  y: 50,
  width: 78,
  height: 69,
  scale: 1,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  opacity: 1,
  radius: 12,
  shadow: 40,
  shadowType: 'spread',
  shadowAngle: 90,
  shadowColor: '#000000',
  device: 'browser',
  model: '',
  landscape: false,
  style: 'default',
  frameColor: '#202229',
  fit: 'cover',
  cropX: 50,
  cropY: 50,
  zoom: 1,
  flipX: false,
  flipY: false,
  hidden: false,
  locked: false,
  reflection: 0,
  padding: 12,
  text: 'Add your text',
  color: '#ffffff',
  fontSize: 52,
  fontFamily: 'Inter, Arial, sans-serif',
  align: 'center',
  bold: true,
  shape: 'sphere',
  filter: 'none',
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  motion: 'none',
  keyframes: [],
  trimStart: 0,
  trimEnd: 6,
  speed: 1,
  muted: true,
  url: 'yourwebsite.com',
  ...values,
})
export const newProject = (): Project => ({
  version: 1,
  name: 'Untitled',
  width: 1600,
  height: 1200,
  layers: [layer()],
  background: {
    type: 'gradient',
    colors: ['#c4b5fd', '#765bea', '#352784'],
    angle: 135,
    src: '',
    blur: 0,
    noise: 3,
    pattern: 'none',
    overlay: 'none',
    overlayOpacity: 20,
  },
  watermark: { text: '', src: '', opacity: 0.8, size: 24, position: 'bottom-right' },
  animation: {
    duration: 6,
    fps: 30,
    easing: 'ease-in-out',
    loop: true,
    zoom: 1.35,
    focusX: 50,
    focusY: 50,
  },
})
export const devices: { id: Device; name: string; ratio: number }[] = [
  { id: 'none', name: 'Screenshot', ratio: 1.6 },
  { id: 'browser', name: 'Chrome', ratio: 1.6 },
  { id: 'safari', name: 'Safari', ratio: 1.6 },
  { id: 'arc', name: 'Arc', ratio: 1.5 },
  { id: 'macos', name: 'macOS window', ratio: 1.6 },
  { id: 'windows', name: 'Windows', ratio: 1.6 },
  { id: 'iphone', name: 'iPhone', ratio: 0.47 },
  { id: 'android', name: 'Android', ratio: 0.46 },
  { id: 'tablet', name: 'iPad', ratio: 0.75 },
  { id: 'laptop', name: 'MacBook', ratio: 1.55 },
  { id: 'desktop', name: 'Desktop', ratio: 1.45 },
  { id: 'watch', name: 'Watch', ratio: 0.83 },
  { id: 'polaroid', name: 'Polaroid', ratio: 0.91 },
]
export const motions: { id: Motion; name: string; group: string }[] = [
  ['none', 'Still', 'Basic'],
  ['zoom-in', 'Zoom in', 'Zoom'],
  ['zoom-out', 'Zoom out', 'Zoom'],
  ['focus', 'Focus zoom', 'Zoom'],
  ['pan-left', 'Pan left', 'Pan'],
  ['pan-right', 'Pan right', 'Pan'],
  ['pan-up', 'Pan up', 'Pan'],
  ['pan-down', 'Pan down', 'Pan'],
  ['float', 'Float', 'Loop'],
  ['orbit', 'Orbit', 'Loop'],
  ['pulse', 'Breathe', 'Loop'],
  ['swing', 'Swing', 'Loop'],
  ['rock', 'Rock', 'Loop'],
  ['parallax', 'Parallax', '3D'],
  ['depth', 'Depth', '3D'],
  ['flip-x', 'Flip X', '3D'],
  ['flip-y', 'Flip Y', '3D'],
  ['spin', 'Spin', '3D'],
  ['reveal', 'Reveal', 'Entrance'],
  ['fade', 'Fade', 'Entrance'],
  ['bounce', 'Bounce', 'Entrance'],
  ['rise', 'Rise', 'Entrance'],
  ['drop', 'Drop', 'Entrance'],
  ['slide-left', 'Slide left', 'Entrance'],
  ['slide-right', 'Slide right', 'Entrance'],
].map(([id, name, group]) => ({ id: id as Motion, name, group }))
export const backgrounds = [
  { name: 'Iris', colors: ['#c4b5fd', '#765bea', '#352784'] },
  { name: 'Tide', colors: ['#b5f1e2', '#3badaf', '#176282'] },
  { name: 'Sunset', colors: ['#ffcdaa', '#ef737c', '#7c4087'] },
  { name: 'Rose', colors: ['#ffe4ec', '#eaa1b2', '#af6989'] },
  { name: 'Glacier', colors: ['#c4f5ff', '#74a8ea', '#4860bb'] },
  { name: 'Lime', colors: ['#e9f6ae', '#a5d773', '#4c8c77'] },
  { name: 'Ember', colors: ['#ffdc8a', '#f18e5c', '#a3415a'] },
  { name: 'Ink', colors: ['#626773', '#2a2e36', '#111319'] },
  { name: 'Cloud', colors: ['#ffffff', '#e5e8ef', '#c1c7d5'] },
  { name: 'Lilac', colors: ['#f2c7fa', '#b29af4', '#7579df'] },
  { name: 'Marine', colors: ['#81def5', '#3e86db', '#143070'] },
  { name: 'Peach', colors: ['#fff3dd', '#edc6ba', '#c39fc3'] },
  { name: 'Aurora', colors: ['#bdffe3', '#728fff', '#a347f5'] },
  { name: 'Sand', colors: ['#fff0c6', '#e0b783', '#9d7c69'] },
  { name: 'Cherry', colors: ['#ffb1c7', '#dd447f', '#702257'] },
  { name: 'Forest', colors: ['#bedbb2', '#4e956a', '#183c3b'] },
  { name: 'Electric', colors: ['#c0caff', '#9a5fff', '#4731ac'] },
  { name: 'Ocean', colors: ['#87ffe4', '#338bc8', '#11235a'] },
  { name: 'Copper', colors: ['#f5bf97', '#c17854', '#6a3f3b'] },
  { name: 'Steel', colors: ['#c1d5df', '#617888', '#25303e'] },
  { name: 'Orchid', colors: ['#edc1ff', '#b459cc', '#612b91'] },
  { name: 'Dawn', colors: ['#ffd6b8', '#d5adce', '#8792c5'] },
  { name: 'Mint', colors: ['#dcffe7', '#8ad8b0', '#3b8e7d'] },
  { name: 'Clay', colors: ['#eccdc3', '#ca9f9a', '#815c74'] },
]
export const sizes = [
  { name: 'Landscape', width: 1600, height: 1200 },
  { name: 'Square', width: 1200, height: 1200 },
  { name: 'Portrait', width: 1080, height: 1350 },
  { name: 'Story / Reel', width: 1080, height: 1920 },
  { name: 'Widescreen', width: 1920, height: 1080 },
  { name: 'Open Graph', width: 1200, height: 630 },
  { name: 'LinkedIn', width: 1200, height: 627 },
  { name: 'X post', width: 1600, height: 900 },
  { name: 'YouTube', width: 1280, height: 720 },
  { name: 'App Store', width: 1290, height: 2796 },
]
export const templates = [
  {
    name: 'Iris',
    description: 'A simple browser presentation',
    bg: 0,
    device: 'browser',
    rotate: 0,
    rx: 0,
    ry: 0,
    layout: 'single',
  },
  {
    name: 'Perspective',
    description: 'A little depth',
    bg: 4,
    device: 'browser',
    rotate: -7,
    rx: 12,
    ry: -18,
    layout: 'single',
  },
  {
    name: 'Pocket',
    description: 'An app in focus',
    bg: 1,
    device: 'iphone',
    rotate: 8,
    rx: 0,
    ry: -12,
    layout: 'single',
  },
  {
    name: 'Side by side',
    description: 'Room for two',
    bg: 3,
    device: 'iphone',
    rotate: -8,
    rx: 0,
    ry: 0,
    layout: 'duo',
  },
  {
    name: 'Studio',
    description: 'A desktop moment',
    bg: 7,
    device: 'laptop',
    rotate: 0,
    rx: 0,
    ry: 0,
    layout: 'single',
  },
  {
    name: 'Editorial',
    description: 'Image and a few words',
    bg: 8,
    device: 'none',
    rotate: 0,
    rx: 0,
    ry: 0,
    layout: 'caption',
  },
  {
    name: 'Floating',
    description: 'Made to move',
    bg: 12,
    device: 'tablet',
    rotate: -7,
    rx: 15,
    ry: -10,
    layout: 'motion',
  },
  {
    name: 'Gallery',
    description: 'Three views together',
    bg: 9,
    device: 'none',
    rotate: 0,
    rx: 0,
    ry: 0,
    layout: 'trio',
  },
  {
    name: 'Night shift',
    description: 'A dark browser frame',
    bg: 10,
    device: 'arc',
    rotate: -5,
    rx: 7,
    ry: 12,
    layout: 'single',
  },
  {
    name: 'Print',
    description: 'A familiar photo border',
    bg: 13,
    device: 'polaroid',
    rotate: -7,
    rx: 0,
    ry: 0,
    layout: 'single',
  },
  {
    name: 'Android',
    description: 'A clean phone mockup',
    bg: 5,
    device: 'android',
    rotate: -8,
    rx: 0,
    ry: 13,
    layout: 'single',
  },
  {
    name: 'Watch face',
    description: 'Small screen, big canvas',
    bg: 6,
    device: 'watch',
    rotate: -12,
    rx: 12,
    ry: -15,
    layout: 'single',
  },
]
export function applyTemplate(p: Project, index: number): Project {
  const t = templates[index],
    base = p.layers.find((l) => l.kind === 'media') || layer(),
    device = t.device as Device
  const ratio = devices.find((d) => d.id === device)!.ratio,
    h = 72,
    w = ((h * p.height) / p.width) * ratio
  const a = layer({
    ...base,
    id: uid(),
    x: 50,
    y: 50,
    width: Math.min(82, w),
    height: h,
    device,
    model: deviceModels[device]?.[0]?.name || '',
    landscape: false,
    rotate: t.rotate,
    rotateX: t.rx,
    rotateY: t.ry,
    motion: t.layout === 'motion' ? 'float' : 'none',
  })
  let layers = [a]
  if (t.layout === 'duo') {
    layers = [
      { ...a, x: 34, width: 25, height: 72 },
      { ...a, id: uid(), x: 67, y: 52, rotate: 8, width: 25, height: 72 },
    ]
  }
  if (t.layout === 'trio') {
    layers = [
      { ...a, x: 28, y: 47, width: 42, height: 50, rotate: -10 },
      { ...a, id: uid(), x: 72, y: 47, width: 42, height: 50, rotate: 10 },
      { ...a, id: uid(), x: 50, y: 65, width: 42, height: 50 },
    ]
  }
  if (t.layout === 'caption') {
    layers = [
      { ...a, y: 59, width: 74, height: 58 },
      layer({
        kind: 'text',
        name: 'Headline',
        text: 'Project notes',
        x: 50,
        y: 16,
        width: 86,
        height: 12,
        color: '#252736',
        fontSize: 64,
        device: 'none',
      }),
    ]
  }
  return {
    ...p,
    layers,
    background: { ...p.background, type: 'gradient', colors: backgrounds[t.bg].colors },
  }
}

export const deviceModels: Partial<Record<Device, { name: string; ratio: number }[]>> = {
  iphone: [
    { name: 'iPhone 17 Pro', ratio: 0.46 },
    { name: 'iPhone 17', ratio: 0.47 },
    { name: 'iPhone Air', ratio: 0.46 },
    { name: 'iPhone 16 Pro', ratio: 0.46 },
    { name: 'iPhone 15', ratio: 0.47 },
    { name: 'iPhone 14', ratio: 0.47 },
    { name: 'iPhone 13', ratio: 0.47 },
    { name: 'iPhone 12', ratio: 0.47 },
    { name: 'iPhone SE', ratio: 0.49 },
  ],
  android: [
    { name: 'Galaxy S25', ratio: 0.46 },
    { name: 'Galaxy S10', ratio: 0.47 },
    { name: 'Pixel 10', ratio: 0.46 },
  ],
  tablet: [
    { name: 'iPad Pro 13', ratio: 0.75 },
    { name: 'iPad Air 11', ratio: 0.7 },
    { name: 'iPad mini', ratio: 0.66 },
  ],
  laptop: [
    { name: 'MacBook Pro 16', ratio: 1.55 },
    { name: 'MacBook Pro 14', ratio: 1.55 },
    { name: 'MacBook Air 13', ratio: 1.54 },
  ],
  desktop: [
    { name: 'iMac 24', ratio: 1.48 },
    { name: 'Studio Display', ratio: 1.45 },
  ],
  watch: [
    { name: 'Watch Series 11', ratio: 0.84 },
    { name: 'Watch Ultra', ratio: 0.86 },
  ],
}
