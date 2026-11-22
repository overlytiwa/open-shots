import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import {
  Camera,
  ChevronDown,
  Undo2,
  Redo2,
  Download,
  Upload,
  Plus,
  Play,
  Pause,
  Maximize2,
  Layers,
  Image,
  LayoutTemplate,
  Palette,
  SlidersHorizontal,
  Type,
  Sparkles,
  Clapperboard,
  Stamp,
  MonitorDown,
  Github,
  FolderOpen,
  Save,
  Link,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  X,
  Check,
  RotateCcw,
  Keyboard,
  Sun,
  Moon,
  MoveUp,
  MoveDown,
  LoaderCircle,
  FileImage,
  GripVertical,
} from 'lucide-react'
import { newProject, layer, uid, type Project, type Layer } from './core/model'
import { media, render, hitLayer, corners } from './core/renderer'
import { animatedLayer } from './core/animation'
import {
  saveProject,
  loadProject,
  readFile,
  download,
  validateProject,
  projectLink,
  loadLink,
} from './core/storage'
import { exportProject, outputSize, type Format } from './core/export'
import { Inspector, panelNames, type Panel } from './components/Inspector'
import { Range, Select, NumberField, Toggle } from './components/Controls'
const repo = 'https://github.com/overlytiwa/open-shots'
const panels: { id: Panel; icon: typeof Camera; label: string }[] = [
  { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
  { id: 'mockup', icon: MonitorDown, label: 'Mockup' },
  { id: 'background', icon: Palette, label: 'Background' },
  { id: 'layout', icon: Layers, label: 'Layout' },
  { id: 'style', icon: SlidersHorizontal, label: 'Style' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'effects', icon: Sparkles, label: 'Effects' },
  { id: 'motion', icon: Clapperboard, label: 'Animate' },
  { id: 'brand', icon: Stamp, label: 'Watermark' },
]
export default function App() {
  const [p, setP] = useState<Project>(newProject),
    [selected, setSelected] = useState(''),
    [panel, setPanel] = useState<Panel>('background'),
    [ready, setReady] = useState(false),
    [saved, setSaved] = useState('Saved on this device'),
    [toast, setToast] = useState(''),
    [menu, setMenu] = useState(false),
    [dialog, setDialog] = useState<'' | 'export' | 'share' | 'shortcuts' | 'desktop' | 'new'>(''),
    [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [timeline, setTimeline] = useState(false),
    [preview, setPreview] = useState(false),
    [zoom, setZoom] = useState(100),
    [performanceMode, setPerformanceMode] = useState(false),
    [light, setLight] = useState(false),
    [draggingFile, setDraggingFile] = useState(false),
    [mobilePanel, setMobilePanel] = useState(false),
    [layerList, setLayerList] = useState(false)
  const [stageSize, setStageSize] = useState({ w: 1000, h: 800 }),
    [format, setFormat] = useState<Format>('png'),
    [scale, setScale] = useState(1),
    [quality, setQuality] = useState(0.92),
    [progress, setProgress] = useState<number | null>(null),
    [shareUrl, setShareUrl] = useState(''),
    [shareBusy, setShareBusy] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null),
    board = useRef<HTMLDivElement>(null),
    fileInput = useRef<HTMLInputElement>(null),
    projectInput = useRef<HTMLInputElement>(null),
    uploadTarget = useRef<string | undefined>(undefined),
    abort = useRef<AbortController | null>(null),
    hist = useRef<{ past: Project[]; future: Project[]; stamp: number }>({
      past: [],
      future: [],
      stamp: 0,
    }),
    projectRef = useRef(p),
    timeRef = useRef(time),
    playingRef = useRef(playing),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    [historyVersion, refreshHistory] = useState(0),
    [mediaVersion, refreshMedia] = useState(0)
  const current = p.layers.find((l) => l.id === selected)
  const notify = useCallback((s: string) => {
    setToast(s)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 4500)
  }, [])
  const change = useCallback(
    (fn: (p: Project) => Project) => {
      const previous = projectRef.current,
        next = fn(previous)
      if (next === previous) return
      if (next.layers.length > 100) {
        notify('A project can contain up to 100 layers')
        return
      }
      if (next.width * next.height > 33_554_432) {
        notify('The canvas can be up to 32 megapixels')
        return
      }
      const now = Date.now()
      if (now - hist.current.stamp > 350) {
        hist.current.past.push(previous)
        if (hist.current.past.length > 100) hist.current.past.shift()
      }
      hist.current.future = []
      hist.current.stamp = now
      projectRef.current = next
      setP(next)
      refreshHistory((v) => v + 1)
    },
    [notify],
  )
  const update = useCallback(
    (v: Partial<Layer>) =>
      change((p) => ({
        ...p,
        layers: p.layers.map((l) => (l.id === selected ? { ...l, ...v } : l)),
      })),
    [selected, change],
  )
  const undo = useCallback(() => {
    const previous = hist.current.past.pop()
    if (previous) {
      hist.current.future.push(projectRef.current)
      projectRef.current = previous
      setP(previous)
      hist.current.stamp = 0
      refreshHistory((v) => v + 1)
    }
  }, [])
  const redo = useCallback(() => {
    const next = hist.current.future.pop()
    if (next) {
      hist.current.past.push(projectRef.current)
      projectRef.current = next
      setP(next)
      hist.current.stamp = 0
      refreshHistory((v) => v + 1)
    }
  }, [])
  const upload = useCallback((target?: string) => {
    uploadTarget.current = target
    fileInput.current?.click()
  }, [])
  const saveFile = useCallback(
    () =>
      download(
        new Blob([JSON.stringify(projectRef.current)], { type: 'application/json' }),
        `${projectRef.current.name || 'Untitled'}.openshot`,
      ),
    [],
  )
  const remove = useCallback(() => {
    change((p) => ({ ...p, layers: p.layers.filter((l) => l.id !== selected) }))
    setSelected('')
  }, [change, selected])
  const duplicate = useCallback(() => {
    const source = projectRef.current.layers.find((l) => l.id === selected)
    if (source) {
      const copy = {
        ...source,
        id: uid(),
        name: source.name + ' copy',
        x: source.x + 3,
        y: source.y + 3,
      }
      change((p) => ({ ...p, layers: [...p.layers, copy] }))
      setSelected(copy.id)
    }
  }, [selected, change])
  const reorder = (direction: number) => {
    change((p) => {
      const ls = [...p.layers],
        i = ls.findIndex((l) => l.id === selected),
        j = i + direction
      if (i < 0 || j < 0 || j >= ls.length) return p
      ;[ls[i], ls[j]] = [ls[j], ls[i]]
      return { ...p, layers: ls }
    })
  }
  useEffect(() => {
    projectRef.current = p
  }, [p])
  useEffect(() => {
    timeRef.current = time
  }, [time])
  useEffect(() => {
    playingRef.current = playing
  }, [playing])
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const shared = await loadLink(),
          stored = shared || (await loadProject())
        if (alive && stored) {
          setP(stored)
          if (shared) notify('Shared project opened. A copy is saved on this device')
        }
      } catch (e) {
        if (alive) notify((e as Error).message)
      } finally {
        if (alive) setReady(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [notify])
  useEffect(() => {
    if (!ready) return
    setSaved('Saving…')
    const timer = setTimeout(() => {
      void saveProject(p)
        .then(() => setSaved('Saved on this device'))
        .catch(() => setSaved('Could not autosave. Save a project file'))
    }, 600)
    return () => clearTimeout(timer)
  }, [p, ready])
  useEffect(() => {
    if (!selected || !p.layers.some((l) => l.id === selected))
      setSelected(p.layers.at(-1)?.id || '')
  }, [p.layers, selected])
  useEffect(() => {
    let alive = true
    media
      .prepare(p)
      .then(() => {
        if (alive) refreshMedia((v) => v + 1)
      })
      .catch((e) => notify((e as Error).message))
    return () => {
      alive = false
    }
  }, [p.layers.map((l) => l.src).join('|'), p.background.src, p.watermark.src, notify])
  useEffect(() => {
    if (!board.current) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setStageSize({ w: r.width, h: r.height })
    })
    ro.observe(board.current)
    return () => ro.disconnect()
  }, [preview])
  const draw = useCallback(
    (t: number) => {
      const c = canvas.current?.getContext('2d')
      if (!c) return
      const ratio = performanceMode ? Math.min(1, 900 / p.width) : Math.min(1, 1800 / p.width)
      c.setTransform(ratio, 0, 0, ratio, 0, 0)
      render(c, p, t, media, performanceMode)
    },
    [p, performanceMode],
  )
  useEffect(() => {
    draw(time)
  }, [draw, time, mediaVersion])
  useEffect(() => {
    if (!playing) return
    let frame = 0,
      cancelled = false,
      last = performance.now()
    const loop = async (now: number) => {
      if (cancelled) return
      const delta = Math.min(0.1, (now - last) / 1000)
      last = now
      let t = timeRef.current + delta
      if (t > projectRef.current.animation.duration) {
        if (projectRef.current.animation.loop) t = 0
        else {
          setPlaying(false)
          setTime(projectRef.current.animation.duration)
          return
        }
      }
      timeRef.current = t
      try {
        await media.seek(projectRef.current, t, false)
      } catch {}
      if (!cancelled) {
        setTime(t)
        frame = requestAnimationFrame(loop)
      }
    }
    frame = requestAnimationFrame(loop)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [playing])
  useEffect(() => {
    if (playing || progress !== null) return
    let alive = true
    void media
      .seek(p, time)
      .then(() => {
        if (alive) draw(time)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [time, playing, draw, p, progress])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const input =
        e.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
      if (input) return
      if (dialog) {
        if (e.key === 'Escape' && progress === null) setDialog('')
        return
      }
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveFile()
      } else if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        projectInput.current?.click()
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicate()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        remove()
      } else if (e.key === ' ') {
        e.preventDefault()
        setPlaying((v) => !v)
        setTimeline(true)
      } else if (e.key === 'Escape') {
        setPreview(false)
        setDialog('')
        setMenu(false)
        setMobilePanel(false)
      } else if (e.key === '?') {
        setDialog('shortcuts')
      } else if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) &&
        current &&
        !current.locked
      ) {
        e.preventDefault()
        const d = e.shiftKey ? 1 : 0.1
        update({
          x: current.x + (e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0),
          y: current.y + (e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0),
        })
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [undo, redo, saveFile, duplicate, remove, current, update, dialog, progress])
  const importFiles = useCallback(
    async (files: File[]) => {
      let target = uploadTarget.current
      uploadTarget.current = undefined
      try {
        for (const file of files) {
          if (file.size > 150_000_000) throw Error('Use files smaller than 150 MB')
          if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            notify('Choose an image or video file')
            continue
          }
          const src = await readFile(file)
          if (target === 'background') {
            if (!file.type.startsWith('image/')) throw Error('Choose an image for the background')
            change((p) => ({ ...p, background: { ...p.background, type: 'image', src } }))
            break
          }
          if (target === 'watermark') {
            if (!file.type.startsWith('image/')) throw Error('Choose an image for the logo')
            change((p) => ({ ...p, watermark: { ...p.watermark, src } }))
            break
          }
          const mediaType: Layer['mediaType'] = file.type.startsWith('video/') ? 'video' : 'image',
            m = await media.get(src, mediaType),
            w = m instanceof HTMLVideoElement ? m.videoWidth : m.naturalWidth,
            h = m instanceof HTMLVideoElement ? m.videoHeight : m.naturalHeight
          if (
            !target &&
            projectRef.current.layers.length === 1 &&
            projectRef.current.layers[0].src === './sample.svg'
          )
            target = projectRef.current.layers[0].id
          const values = {
            src,
            mediaType,
            name: file.name.replace(/\.[^.]+$/, ''),
            trimStart: 0,
            trimEnd: m instanceof HTMLVideoElement ? m.duration : 6,
          }
          if (target) {
            change((p) => ({
              ...p,
              layers: p.layers.map((l) => (l.id === target ? { ...l, ...values } : l)),
            }))
            setSelected(target)
            target = undefined
          } else {
            const a = layer({
              ...values,
              device: 'none',
              height: 65,
              width: Math.min(
                80,
                (((65 * projectRef.current.height) / projectRef.current.width) * w) / h,
              ),
            })
            change((p) => ({ ...p, layers: [...p.layers, a] }))
            setSelected(a.id)
          }
          if (mediaType === 'video') {
            setTimeline(true)
            change((p) => ({
              ...p,
              animation: {
                ...p.animation,
                duration: Math.min(30, (m as HTMLVideoElement).duration),
              },
            }))
          }
        }
      } catch (e) {
        notify((e as Error).message)
      }
    },
    [change, notify],
  )
  useEffect(() => {
    const paste = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName))
        return
      const files = Array.from(e.clipboardData?.files || [])
      if (files.length) {
        e.preventDefault()
        void importFiles(files)
      }
    }
    document.addEventListener('paste', paste)
    return () => document.removeEventListener('paste', paste)
  }, [importFiles])
  async function openProject(e: ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0]
      if (!file) return
      if (file.size > 200_000_000) throw Error('Project file is too large')
      const project = validateProject(JSON.parse(await file.text()))
      change(() => project)
      setSelected(project.layers.at(-1)?.id || '')
      setTime(0)
      setPlaying(false)
      notify('Project opened')
    } catch (e) {
      notify((e as Error).message)
    } finally {
      e.target.value = ''
    }
  }
  const drag = useRef<{ startX: number; startY: number; layer: Layer; resize: boolean } | null>(
    null,
  )
  function pointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (progress !== null || preview) return
    const rect = e.currentTarget.getBoundingClientRect(),
      x = ((e.clientX - rect.left) / rect.width) * p.width,
      y = ((e.clientY - rect.top) / rect.height) * p.height,
      resize = (e.target as HTMLElement).dataset.resize === 'true',
      l = resize ? current : hitLayer(p, x, y, time)
    if (l && !l.locked) {
      setSelected(l.id)
      drag.current = { startX: x, startY: y, layer: l, resize }
      e.currentTarget.setPointerCapture(e.pointerId)
      setPlaying(false)
    } else setSelected('')
  }
  function pointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const rect = e.currentTarget.getBoundingClientRect(),
      x = ((e.clientX - rect.left) / rect.width) * p.width,
      y = ((e.clientY - rect.top) / rect.height) * p.height,
      d = drag.current,
      dx = ((x - d.startX) / p.width) * 100,
      dy = ((y - d.startY) / p.height) * 100
    change((p) => ({
      ...p,
      layers: p.layers.map((l) =>
        l.id !== d.layer.id
          ? l
          : {
              ...l,
              ...(d.resize
                ? {
                    width: Math.max(3, d.layer.width + dx / d.layer.scale),
                    height: Math.max(3, d.layer.height + dy / d.layer.scale),
                  }
                : {
                    x: e.shiftKey ? Math.round(d.layer.x + dx) : d.layer.x + dx,
                    y: e.shiftKey ? Math.round(d.layer.y + dy) : d.layer.y + dy,
                  }),
            },
      ),
    }))
  }
  async function doExport() {
    if (progress !== null) return
    setPlaying(false)
    setProgress(0)
    abort.current = new AbortController()
    try {
      const blob = await exportProject(p, {
        format,
        scale,
        quality,
        time,
        signal: abort.current.signal,
        progress: setProgress,
      })
      download(blob, `${p.name || 'Untitled'}.${format === 'jpeg' ? 'jpg' : format}`)
      notify('Export saved')
      setDialog('')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') notify((e as Error).message)
    } finally {
      setProgress(null)
      abort.current = null
      draw(time)
    }
  }
  async function copyImage() {
    try {
      setPlaying(false)
      const blob = await exportProject(p, {
        format: 'png',
        scale: 1,
        quality: 1,
        time,
        progress: () => {},
      })
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      notify('Image copied')
    } catch (e) {
      notify('Clipboard is unavailable here. Use Export to save the image')
    }
  }
  async function share() {
    if (window.openshot || location.protocol === 'file:') {
      notify('Save a project file to share from the desktop app')
      return
    }
    setShareBusy(true)
    try {
      setShareUrl(await projectLink(p))
      setDialog('share')
    } catch (e) {
      notify((e as Error).message)
    } finally {
      setShareBusy(false)
    }
  }
  const ratio = performanceMode ? Math.min(1, 900 / p.width) : Math.min(1, 1800 / p.width),
    viewScale =
      (Math.min((stageSize.w - (preview ? 40 : 90)) / p.width, (stageSize.h - 100) / p.height) *
        zoom) /
      100,
    displayW = Math.max(64, p.width * viewScale),
    displayH = Math.max(64, p.height * viewScale),
    selection =
      current && !current.hidden ? corners(animatedLayer(current, p, time), p.width, p.height) : []
  let dimensions = ''
  try {
    const s = outputSize(p, scale)
    dimensions = `${s.width} × ${s.height} px`
  } catch {
    dimensions = 'Size exceeds export limit'
  }
  const isMotion = ['mp4', 'webm', 'gif'].includes(format)
  return (
    <div
      className={'app ' + (light ? 'light ' : '') + (preview ? 'preview-mode' : '')}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes('Files')) {
          e.preventDefault()
          setDraggingFile(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDraggingFile(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDraggingFile(false)
        void importFiles(Array.from(e.dataTransfer.files))
      }}
    >
      <input
        ref={fileInput}
        hidden
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => {
          void importFiles(Array.from(e.target.files || []))
          e.target.value = ''
        }}
      />
      <input
        ref={projectInput}
        hidden
        type="file"
        accept=".openshot,.json"
        onChange={(e) => void openProject(e)}
      />
      <header className="topbar">
        <div className="brand">
          <img src="./icon.png" alt="" />
          <span>OpenShot</span>
        </div>
        <div className="project-menu">
          <button
            className="project-button"
            aria-label="Project menu"
            onClick={() => setMenu(!menu)}
          >
            {p.name}
            <ChevronDown size={14} />
          </button>
          <span className="save-status">
            <Check size={12} />
            {saved}
          </span>
          {menu && (
            <>
              <button
                className="menu-dismiss"
                aria-label="Close project menu"
                onClick={() => setMenu(false)}
              />
              <div className="dropdown">
                <label className="field">
                  <span>Project name</span>
                  <input
                    value={p.name}
                    onChange={(e) => change((p) => ({ ...p, name: e.target.value }))}
                  />
                </label>
                <button
                  onClick={() => {
                    setDialog('new')
                    setMenu(false)
                  }}
                >
                  <Plus size={16} /> New project
                </button>
                <button
                  onClick={() => {
                    projectInput.current?.click()
                    setMenu(false)
                  }}
                >
                  <FolderOpen size={16} /> Open project <kbd>Ctrl O</kbd>
                </button>
                <button
                  onClick={() => {
                    saveFile()
                    setMenu(false)
                  }}
                >
                  <Save size={16} /> Save project <kbd>Ctrl S</kbd>
                </button>
                <button
                  onClick={() => {
                    void share()
                    setMenu(false)
                  }}
                >
                  <Link size={16} /> Share project
                </button>
                <hr />
                <button
                  onClick={() => {
                    setDialog('shortcuts')
                    setMenu(false)
                  }}
                >
                  <Keyboard size={16} /> Shortcuts
                </button>
                <button
                  onClick={() => {
                    setLight(!light)
                    setMenu(false)
                  }}
                >
                  {light ? <Moon size={16} /> : <Sun size={16} />} {light ? 'Dark' : 'Light'}{' '}
                  appearance
                </button>
                <label className="toggle">
                  <span>Performance mode</span>
                  <input
                    type="checkbox"
                    checked={performanceMode}
                    onChange={(e) => setPerformanceMode(e.target.checked)}
                  />
                </label>
              </div>
            </>
          )}
        </div>
        <div className="history-buttons">
          <button
            title="Undo (Ctrl Z)"
            aria-label="Undo"
            disabled={!hist.current.past.length}
            onClick={undo}
          >
            <Undo2 size={17} />
          </button>
          <button
            title="Redo (Ctrl Shift Z)"
            aria-label="Redo"
            disabled={!hist.current.future.length}
            onClick={redo}
          >
            <Redo2 size={17} />
          </button>
        </div>
        <div className="top-actions">
          <a
            className="icon-button github-link"
            href={repo}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
          >
            <Github size={18} />
          </a>
          <button className="desktop-button" onClick={() => setDialog('desktop')}>
            <MonitorDown size={16} />
            <span>Get desktop app</span>
          </button>
          <button
            className="secondary share-button"
            onClick={() => void share()}
            disabled={shareBusy}
          >
            <Link size={16} />
            <span>Share</span>
          </button>
          <button className="primary" onClick={() => setDialog('export')}>
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </header>
      <div className="editor">
        <nav className="tool-rail" aria-label="Editor tools">
          {panels.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={panel === id ? 'active' : ''}
              onClick={() => {
                setPanel(id)
                setMobilePanel(true)
              }}
              aria-label={panelNames[id]}
              aria-pressed={panel === id}
            >
              <Icon size={21} strokeWidth={1.6} />
              <span>{label}</span>
            </button>
          ))}
          <button
            className="help-button"
            aria-label="Keyboard shortcuts"
            onClick={() => setDialog('shortcuts')}
          >
            <Keyboard size={20} />
          </button>
        </nav>
        <aside className={'inspector ' + (mobilePanel ? 'mobile-open' : '')}>
          <div className="panel-header">
            <h2>{panelNames[panel]}</h2>
            <button
              className="mobile-close"
              aria-label="Close tools"
              onClick={() => setMobilePanel(false)}
            >
              <X size={18} />
            </button>
            {panel === 'background' && <span className="count-label">24 gradients</span>}
          </div>
          <div className="panel-scroll">
            <Inspector
              panel={panel}
              p={p}
              selected={selected}
              setSelected={setSelected}
              change={change}
              update={update}
              upload={upload}
              time={time}
              notify={notify}
            />
          </div>
          <div className="inspector-footer">
            <Lock size={13} />
            <span>Files stay on your device</span>
          </div>
        </aside>
        <main className="workspace">
          <div className="canvas-toolbar">
            <div className="canvas-meta">
              <span>Canvas</span>
              <button
                title="Change canvas size"
                onClick={() => {
                  setPanel('layout')
                  setMobilePanel(true)
                }}
              >
                {p.width} × {p.height}
                <ChevronDown size={13} />
              </button>
            </div>
            <div className="canvas-actions">
              <button className="text-button" onClick={() => upload()}>
                <Plus size={16} />
                <span>Add media</span>
              </button>
              {window.openshot && (
                <button
                  className="text-button"
                  onClick={() =>
                    void window.openshot!.capture().then(async (src) => {
                      if (src) {
                        const response = await fetch(src),
                          blob = await response.blob()
                        await importFiles([
                          new File([blob], 'Screen capture.png', { type: 'image/png' }),
                        ])
                      }
                    })
                  }
                >
                  <Camera size={16} />
                  <span>Capture</span>
                </button>
              )}
              <button
                title="Preview"
                aria-label="Preview canvas"
                onClick={() => setPreview(!preview)}
              >
                <Maximize2 size={17} />
              </button>
            </div>
          </div>
          <div className="workboard" ref={board}>
            <div className="stage-area">
              <div
                className={
                  'canvas-stage ' + (p.background.type === 'transparent' ? 'checkerboard' : '')
                }
                style={{ width: displayW, height: displayH }}
                onPointerDown={pointerDown}
                onPointerMove={pointerMove}
                onPointerUp={() => {
                  drag.current = null
                }}
                onPointerCancel={() => {
                  drag.current = null
                }}
                onDoubleClick={() => current?.kind === 'media' && upload(current.id)}
              >
                <canvas
                  ref={canvas}
                  width={Math.round(p.width * ratio)}
                  height={Math.round(p.height * ratio)}
                  aria-label="Mockup canvas"
                />
                {current && !preview && progress === null && (
                  <svg className="selection-overlay" viewBox={`0 0 ${p.width} ${p.height}`}>
                    <polygon
                      points={selection.map((v) => `${v.x},${v.y}`).join(' ')}
                      fill="none"
                      stroke="#d4e8ff"
                      strokeWidth={1 / viewScale}
                      strokeOpacity=".65"
                    />
                    {selection.map((pt, i) => (
                      <rect
                        key={i}
                        x={pt.x - 3 / viewScale}
                        y={pt.y - 3 / viewScale}
                        width={6 / viewScale}
                        height={6 / viewScale}
                        fill="#ffffff"
                        stroke="#7a90b5"
                        strokeWidth={1 / viewScale}
                        data-resize={i === 2 ? 'true' : 'false'}
                        className={i === 2 ? 'resize-handle' : ''}
                      />
                    ))}
                  </svg>
                )}
                {!p.layers.length && (
                  <button className="empty-canvas" onClick={() => upload()}>
                    <Image size={40} strokeWidth={1} />
                    <strong>Add a screenshot</strong>
                    <span>Drop an image or video here, or click to choose</span>
                  </button>
                )}
              </div>
              {current && !preview && (
                <div className="selection-tools">
                  <span>{current.name}</span>
                  <button title="Duplicate" aria-label="Duplicate layer" onClick={duplicate}>
                    <Copy size={15} />
                  </button>
                  <button
                    title="Bring forward"
                    aria-label="Bring layer forward"
                    onClick={() => reorder(1)}
                  >
                    <MoveUp size={15} />
                  </button>
                  <button
                    title="Send backward"
                    aria-label="Send layer backward"
                    onClick={() => reorder(-1)}
                  >
                    <MoveDown size={15} />
                  </button>
                  <button title="Delete" aria-label="Delete layer" onClick={remove}>
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="viewbar">
            <button
              className={'text-button ' + (timeline ? 'active' : '')}
              onClick={() => setTimeline(!timeline)}
            >
              <Clapperboard size={16} />
              <span>Timeline</span>
              {timeline ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>
            <div className="zoom-control">
              <button title="Fit canvas" onClick={() => setZoom(100)}>
                {zoom}%
              </button>
              <input
                aria-label="Canvas zoom"
                type="range"
                min={30}
                max={150}
                value={zoom}
                onChange={(e) => setZoom(+e.target.value)}
              />
            </div>
            <span className="drop-hint">Drop or paste an image to start</span>
            <button className="text-button layers-toggle" onClick={() => setLayerList(!layerList)}>
              <Layers size={16} />
              {p.layers.length} layers
            </button>
          </div>
          {timeline && (
            <div className="timeline">
              <div className="transport">
                <button
                  className="play-button"
                  aria-label={playing ? 'Pause animation' : 'Play animation'}
                  onClick={() => {
                    if (time >= p.animation.duration) setTime(0)
                    setPlaying(!playing)
                  }}
                >
                  {playing ? <Pause size={17} /> : <Play size={17} />}
                </button>
                <button aria-label="Restart animation" onClick={() => setTime(0)}>
                  <RotateCcw size={15} />
                </button>
                <span>
                  {time.toFixed(2)} <small>/ {p.animation.duration.toFixed(2)}s</small>
                </span>
                <label>
                  Duration
                  <input
                    aria-label="Timeline duration"
                    type="number"
                    min={0.5}
                    max={60}
                    step={0.5}
                    value={p.animation.duration}
                    onChange={(e) =>
                      change((p) => ({
                        ...p,
                        animation: {
                          ...p.animation,
                          duration: Math.max(0.5, Math.min(60, +e.target.value)),
                        },
                      }))
                    }
                  />
                  s
                </label>
              </div>
              <input
                aria-label="Animation playhead"
                className="playhead"
                type="range"
                min={0}
                max={p.animation.duration}
                step={0.01}
                value={time}
                onChange={(e) => {
                  setPlaying(false)
                  setTime(+e.target.value)
                }}
              />
              <div className="timeline-ruler">
                <span>0s</span>
                <span>{(p.animation.duration / 4).toFixed(1)}s</span>
                <span>{(p.animation.duration / 2).toFixed(1)}s</span>
                <span>{(p.animation.duration * 0.75).toFixed(1)}s</span>
                <span>{p.animation.duration}s</span>
              </div>
              <div className="timeline-tracks">
                {p.layers
                  .filter((l) => !l.hidden)
                  .map((l) => (
                    <button
                      className={'track ' + (l.id === selected ? 'selected' : '')}
                      key={l.id}
                      onClick={() => {
                        setSelected(l.id)
                        setPanel('motion')
                      }}
                    >
                      <span>{l.name}</span>
                      <div>
                        {l.keyframes.length ? (
                          l.keyframes.map((k) => (
                            <i
                              key={k.id}
                              title={k.time + 's'}
                              style={{ left: `${(k.time / p.animation.duration) * 100}%` }}
                            />
                          ))
                        ) : (
                          <small>
                            {l.motion === 'none'
                              ? l.mediaType === 'video'
                                ? 'Video'
                                : 'Still'
                              : l.motion.replaceAll('-', ' ')}
                          </small>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
          {layerList && (
            <div className="layers-popover">
              <div className="panel-header">
                <h3>Layers</h3>
                <button aria-label="Close layers" onClick={() => setLayerList(false)}>
                  <X size={16} />
                </button>
              </div>
              {[...p.layers].reverse().map((l) => (
                <div className={'layer-row ' + (l.id === selected ? 'selected' : '')} key={l.id}>
                  <button className="layer-select" onClick={() => setSelected(l.id)}>
                    {l.kind === 'media' ? (
                      <Image size={15} />
                    ) : l.kind === 'text' ? (
                      <Type size={15} />
                    ) : (
                      <Layers size={15} />
                    )}
                    <span>{l.name}</span>
                  </button>
                  <button
                    title={l.hidden ? 'Show layer' : 'Hide layer'}
                    onClick={() =>
                      change((p) => ({
                        ...p,
                        layers: p.layers.map((a) =>
                          a.id === l.id ? { ...a, hidden: !a.hidden } : a,
                        ),
                      }))
                    }
                  >
                    {l.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    title={l.locked ? 'Unlock layer' : 'Lock layer'}
                    onClick={() =>
                      change((p) => ({
                        ...p,
                        layers: p.layers.map((a) =>
                          a.id === l.id ? { ...a, locked: !a.locked } : a,
                        ),
                      }))
                    }
                  >
                    {l.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                </div>
              ))}
              <button className="wide-button" onClick={() => upload()}>
                <Plus size={15} /> Add media
              </button>
            </div>
          )}
        </main>
      </div>
      {preview && (
        <button className="exit-preview secondary" onClick={() => setPreview(false)}>
          <X size={16} /> Exit preview
        </button>
      )}
      {draggingFile && (
        <div className="drop-overlay">
          <div>
            <Upload size={40} />
            <h2>Drop your media</h2>
            <p>Images and videos stay on this device</p>
          </div>
        </div>
      )}
      {toast && (
        <div role="status" className="toast">
          <span>{toast}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
      {dialog && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (progress === null) setDialog('')
          }}
        >
          <div
            className={'modal ' + (dialog === 'desktop' ? 'desktop-modal' : '')}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <h2 id="dialog-title">
                {dialog === 'export'
                  ? 'Export'
                  : dialog === 'share'
                    ? 'Share project'
                    : dialog === 'shortcuts'
                      ? 'Keyboard shortcuts'
                      : dialog === 'new'
                        ? 'New project'
                        : 'OpenShot for desktop'}
              </h2>
              <button
                aria-label="Close dialog"
                disabled={progress !== null}
                onClick={() => setDialog('')}
              >
                <X size={20} />
              </button>
            </div>
            {dialog === 'export' && (
              <>
                <p className="modal-note">Save your image or animation. No watermark is added.</p>
                <div className="export-type">
                  <button className={!isMotion ? 'active' : ''} onClick={() => setFormat('png')}>
                    <FileImage size={16} /> Image
                  </button>
                  <button className={isMotion ? 'active' : ''} onClick={() => setFormat('mp4')}>
                    <Clapperboard size={16} /> Animation
                  </button>
                </div>
                <Select
                  label="Format"
                  value={format}
                  options={
                    isMotion
                      ? [
                          { value: 'mp4', label: 'MP4 video' },
                          { value: 'webm', label: 'WebM video' },
                          { value: 'gif', label: 'Animated GIF' },
                        ]
                      : [
                          { value: 'png', label: 'PNG (with transparency)' },
                          { value: 'jpeg', label: 'JPG' },
                          { value: 'webp', label: 'WebP' },
                        ]
                  }
                  onChange={(v) => setFormat(v as Format)}
                />
                <Select
                  label="Scale"
                  value={String(scale)}
                  options={[0.5, 1, 1.5, 2, 3, 4].map((s) => ({
                    value: String(s),
                    label: s + '×',
                  }))}
                  onChange={(v) => setScale(+v)}
                />
                <div className="export-dimensions">
                  {dimensions}
                  {isMotion && (
                    <span>
                      {p.animation.duration}s ·{' '}
                      {format === 'gif' ? Math.min(15, p.animation.fps) : p.animation.fps} fps
                    </span>
                  )}
                </div>
                {format !== 'png' && (
                  <Range
                    label="Quality"
                    value={Math.round(quality * 100)}
                    min={30}
                    max={100}
                    suffix="%"
                    onChange={(v) => setQuality(v / 100)}
                  />
                )}
                <label className="field">
                  <span>File name</span>
                  <input
                    value={p.name}
                    onChange={(e) => change((p) => ({ ...p, name: e.target.value }))}
                  />
                </label>
                {isMotion && (
                  <p className="panel-note">
                    Animations export without audio. Transparent video backgrounds are flattened to
                    black in MP4.
                  </p>
                )}
                {format === 'jpeg' && p.background.type === 'transparent' && (
                  <p className="panel-note">
                    JPG does not support transparency. Use PNG or WebP to keep it.
                  </p>
                )}
                {progress !== null ? (
                  <div className="export-progress">
                    <div>
                      <span>Rendering…</span>
                      <span>{Math.round(progress * 100)}%</span>
                    </div>
                    <progress max={1} value={progress} />
                    <button className="wide-button" onClick={() => abort.current?.abort()}>
                      Cancel export
                    </button>
                  </div>
                ) : (
                  <>
                    <button className="primary full" onClick={() => void doExport()}>
                      <Download size={16} /> Export{' '}
                      {format === 'jpeg' ? 'JPG' : format.toUpperCase()}
                    </button>
                    {!isMotion && (
                      <button className="wide-button" onClick={() => void copyImage()}>
                        <Copy size={16} /> Copy image
                      </button>
                    )}
                  </>
                )}
              </>
            )}
            {dialog === 'share' && (
              <>
                <p className="modal-note">
                  This link contains your project and media. Anyone with the link can open and edit
                  a copy. Nothing is uploaded to a server.
                </p>
                <textarea aria-label="Project share link" readOnly rows={3} value={shareUrl} />
                <p className="panel-note">
                  Large projects are easier to share as a project file. Some messaging apps shorten
                  or reject long links.
                </p>
                <button
                  className="primary full"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(shareUrl)
                      .then(() => notify('Link copied'))
                      .catch(() => notify('Select the link and copy it manually'))
                  }
                >
                  <Copy size={16} /> Copy link
                </button>
                <button className="wide-button" onClick={saveFile}>
                  <Save size={16} /> Save project file
                </button>
              </>
            )}
            {dialog === 'shortcuts' && (
              <div className="shortcut-list">
                {[
                  ['Undo', 'Ctrl / ⌘ Z'],
                  ['Redo', 'Ctrl / ⌘ Shift Z'],
                  ['Save project', 'Ctrl / ⌘ S'],
                  ['Open project', 'Ctrl / ⌘ O'],
                  ['Duplicate layer', 'Ctrl / ⌘ D'],
                  ['Delete layer', 'Delete'],
                  ['Play / pause', 'Space'],
                  ['Move layer', 'Arrow keys'],
                  ['Move by larger steps', 'Shift + arrows'],
                  ['Exit preview / close', 'Esc'],
                ].map(([a, b]) => (
                  <div key={a}>
                    <span>{a}</span>
                    <kbd>{b}</kbd>
                  </div>
                ))}
              </div>
            )}
            {dialog === 'desktop' && (
              <>
                <div className="desktop-intro">
                  <img src="./icon.png" alt="" />
                  <p>
                    The same editor, in its own window. Work offline, capture your screen, and keep
                    your projects on your computer.
                  </p>
                </div>
                <div className="desktop-downloads">
                  {[
                    {
                      name: 'Windows',
                      detail: 'Installer · x64',
                      asset: 'OpenShot-Windows-x64.exe',
                    },
                    {
                      name: 'macOS',
                      detail: 'Disk image · Apple silicon',
                      asset: 'OpenShot-macOS-arm64.dmg',
                    },
                    {
                      name: 'macOS',
                      detail: 'Disk image · Intel',
                      asset: 'OpenShot-macOS-x64.dmg',
                    },
                    {
                      name: 'Linux',
                      detail: 'AppImage · x64',
                      asset: 'OpenShot-Linux-x64.AppImage',
                    },
                  ].map((d) => (
                    <a key={d.asset} href={`${repo}/releases/latest/download/${d.asset}`}>
                      <div>
                        <strong>{d.name}</strong>
                        <span>{d.detail}</span>
                      </div>
                      <Download size={18} />
                    </a>
                  ))}
                </div>
                <p className="panel-note">
                  Desktop downloads are published by GitHub Actions. Unsigned builds may show a
                  system security prompt.
                </p>
                <a
                  className="wide-button"
                  href={`${repo}/releases`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View all releases
                </a>
              </>
            )}
            {dialog === 'new' && (
              <>
                <p className="modal-note">
                  Save your current project first if you want to keep a separate copy.
                </p>
                <button className="wide-button" onClick={saveFile}>
                  <Save size={16} /> Save current project
                </button>
                <button
                  className="primary full"
                  onClick={() => {
                    change(() => newProject())
                    setTime(0)
                    setPlaying(false)
                    setDialog('')
                    history.replaceState(null, '', location.pathname + location.search)
                  }}
                >
                  Start a new project
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
