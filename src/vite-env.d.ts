/// <reference types="vite/client" />
declare module 'gifenc' {
  export function GIFEncoder(): any
  export function quantize(data: Uint8ClampedArray, colors: number, options?: any): any
  export function applyPalette(data: Uint8ClampedArray, palette: any, format?: string): any
}
interface Window {
  openshot?: { platform: string; version: string; capture: () => Promise<string | null> }
}
