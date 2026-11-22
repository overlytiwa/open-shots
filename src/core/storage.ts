import { parseProject as validateProject } from './validation'
import { newProject, type Project, type Layer } from './model'
const DB = 'openshot',
  STORE = 'projects'
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}
export async function saveProject(p: Project) {
  const d = await db()
  try {
    await new Promise<void>((res, rej) => {
      const tx = d.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(p, 'current')
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
  } finally {
    d.close()
  }
}
export async function loadProject(): Promise<Project | null> {
  const d = await db()
  try {
    return await new Promise((res, rej) => {
      const r = d.transaction(STORE).objectStore(STORE).get('current')
      r.onsuccess = () => res(r.result ? validateProject(r.result) : null)
      r.onerror = () => rej(r.error)
    })
  } finally {
    d.close()
  }
}
export { parseProject as validateProject } from './validation'
export async function projectLink(p: Project): Promise<string> {
  const payload = JSON.stringify(p),
    encoded = new TextEncoder().encode(payload)
  if (encoded.byteLength > 8_000_000)
    throw Error('This project is too large for a link. Save a project file instead')
  const stream = new Blob([encoded]).stream().pipeThrough(new CompressionStream('gzip'))
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const base64 = btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  const url = new URL(location.href)
  url.hash = 'project=' + base64
  if (url.href.length > 1_500_000)
    throw Error('The share link is too long. Save a project file instead')
  return url.href
}
export async function loadLink(): Promise<Project | null> {
  if (!location.hash.startsWith('#project=')) return null
  const base64 = location.hash.slice(9).replaceAll('-', '+').replaceAll('_', '/')
  if (base64.length > 1_500_000) throw Error('Share link exceeds the size limit')
  const binary = atob(base64),
    bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
    reader = stream.getReader()
  let total = 0
  const chunks: Uint8Array[] = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > 100_000_000) {
      await reader.cancel()
      throw Error('Project exceeds the size limit')
    }
    chunks.push(value)
  }
  return validateProject(JSON.parse(await new Blob(chunks as BlobPart[]).text()))
}
export function download(blob: Blob, name: string) {
  const a = document.createElement('a'),
    url = URL.createObjectURL(blob)
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
export function readFile(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsDataURL(file)
  })
}
