import { type ReactNode, useMemo, useState } from 'react'
import { documentToLuau } from '../../export/luau.ts'
import { documentForExport } from '../../export/options.ts'
import { documentToRbxmx } from '../../export/rbxmx.ts'
import { downloadTextFile } from '../../lib/download.ts'
import { measureTextWidth } from '../../lib/text.ts'
import { FONT_WEIGHT } from '../../model/enums.ts'
import { FONTS } from '../../model/fonts.ts'
import { DEVICES } from '../../model/screen.ts'
import {
  exportWarnings,
  type MeasureText,
  type Warning,
} from '../../model/warnings.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { screenOf, useViewStore } from '../../store/viewStore.ts'
import { CloseIcon, CopyIcon, DownloadIcon } from '../panels/icons.tsx'
import { fileBaseName } from '../topbar/projectFiles.ts'
import { Button, IconButton } from '../ui/Button.tsx'
import { Checkbox } from '../ui/Checkbox.tsx'
import { Dialog } from '../ui/Dialog.tsx'

type Format = 'rbxmx' | 'luau'

// Measures text in the browser with the element's real font, so "won't
// fit" warnings are as accurate as the canvas.
const measure: MeasureText = (text, font, size) =>
  measureTextWidth(
    text,
    `${FONT_WEIGHT[font.weight]} ${size}px ${FONTS[font.family].css}`,
  )

// Characters that aren't allowed in file names on some computers.
function safeFileName(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]/g, '_') || 'ScreenGui'
}

// The choices in the dialog. They live in ExportDialog, outside <Dialog>
// (which only draws its content while open), so they're remembered between
// openings. fileName is null until you type one.
type Settings = {
  format: Format
  convertToScale: boolean
  keepOnRespawn: boolean
  fileName: string | null
}

// The export dialog: pick a format (.rbxmx file or Luau script), set the
// options, see what to check first, then download or copy.
export function ExportDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [settings, setSettings] = useState<Settings>({
    format: 'rbxmx',
    convertToScale: true,
    keepOnRespawn: true,
    fileName: null,
  })
  const change = (update: Partial<Settings>) =>
    setSettings((previous) => ({ ...previous, ...update }))

  return (
    <Dialog open={open} onClose={onClose} label="Export">
      <ExportContent settings={settings} change={change} onClose={onClose} />
    </Dialog>
  )
}

function ExportContent({
  settings,
  change,
  onClose,
}: {
  settings: Settings
  change: (update: Partial<Settings>) => void
  onClose: () => void
}) {
  const { format, convertToScale, keepOnRespawn, fileName } = settings
  const [copied, setCopied] = useState(false)
  const doc = useDocumentStore((state) => state.document)
  const screen = useViewStore(screenOf)
  const deviceLabel = useViewStore((state) => DEVICES[state.device].label)
  const rootName = doc.nodes[doc.rootId].name
  // The file name box starts as the ScreenGui's name until you type in it.
  const name = fileName ?? fileBaseName(doc)

  // What would actually be exported, and its warnings. useMemo: only
  // recomputed when the document or an option changes.
  const exported = useMemo(
    () => documentForExport(doc, { convertToScale, screen }),
    [doc, convertToScale, screen],
  )
  const warnings = useMemo(() => exportWarnings(exported, measure), [exported])
  const options = { resetOnSpawn: !keepOnRespawn }

  const counts = useMemo(() => {
    const nodes = Object.values(doc.nodes)
    const modifiers = nodes.reduce(
      (sum, node) => sum + Object.keys(node.modifiers ?? {}).length,
      0,
    )
    return { instances: nodes.length - 1, modifiers }
  }, [doc])

  function download() {
    downloadTextFile(
      `${safeFileName(name)}.rbxmx`,
      documentToRbxmx(exported, options),
      'application/xml',
    )
    onClose()
  }

  async function copy() {
    try {
      // The clipboard needs a secure page (https or localhost).
      await navigator.clipboard.writeText(documentToLuau(exported, options))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.alert('Couldn’t copy to the clipboard. Try the .rbxmx file.')
    }
  }

  // Clicking a warning's action takes you to the problem.
  const { select } = useDocumentStore.getState()
  const { setDevice } = useViewStore.getState()
  function show(warning: Warning, device?: keyof typeof DEVICES) {
    if (device) setDevice(device)
    if (warning.nodeId) select(warning.nodeId)
    onClose()
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-line px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Export {rootName}</h2>
          <p className="text-sm text-muted">
            1 ScreenGui · {counts.instances} instance
            {counts.instances === 1 ? '' : 's'} · {counts.modifiers} modifier
            {counts.modifiers === 1 ? '' : 's'}
          </p>
        </div>
        <IconButton label="Close" onClick={onClose}>
          <CloseIcon size={16} />
        </IconButton>
      </div>

      <div className="space-y-5 px-6 py-5">
        {/* Format choice */}
        <div
          className="grid grid-cols-2 gap-2"
          role="radiogroup"
          aria-label="Format"
        >
          <FormatCard
            selected={format === 'rbxmx'}
            onSelect={() => change({ format: 'rbxmx' })}
            title=".rbxmx file"
            description="Download, insert into StarterGui"
          />
          <FormatCard
            selected={format === 'luau'}
            onSelect={() => change({ format: 'luau' })}
            title="Luau script"
            description="Paste into the Command Bar"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Left: settings and things to check */}
          <div className="space-y-4">
            {format === 'rbxmx' && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  File name
                </span>
                <span className="flex items-center rounded-md bg-raised ring-1 ring-line focus-within:ring-accent">
                  <input
                    value={name}
                    onChange={(event) =>
                      change({ fileName: event.target.value })
                    }
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                  />
                  <span className="pr-3 text-sm text-faint">.rbxmx</span>
                </span>
              </label>
            )}
            <div className="space-y-3">
              <Checkbox
                checked={convertToScale}
                onChange={(on) => change({ convertToScale: on })}
                description={`Keeps the layout the same on phones and tablets (measured on ${deviceLabel}). Your design isn’t changed.`}
              >
                Convert pixel sizes to Scale
              </Checkbox>
              <Checkbox
                checked={keepOnRespawn}
                onChange={(on) => change({ keepOnRespawn: on })}
                description="The GUI stays open when the player respawns"
              >
                Set ResetOnSpawn to false
              </Checkbox>
            </div>
            <ThingsToCheck warnings={warnings} onShow={show} />
          </div>

          {/* Right: what to do in Studio */}
          <StudioSteps
            format={format}
            fileName={`${safeFileName(name)}.rbxmx`}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4 border-t border-line px-6 py-4">
        <p className="text-xs text-faint">
          Exports are made in your browser. Nothing is uploaded.
        </p>
        <div className="flex gap-2">
          <Button onClick={onClose}>Cancel</Button>
          {format === 'rbxmx' ? (
            <Button
              variant="primary"
              icon={<DownloadIcon />}
              onClick={download}
            >
              Download {safeFileName(name)}.rbxmx
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={<CopyIcon />}
              onClick={copy}
              className="min-w-40"
            >
              {copied ? 'Copied!' : 'Copy Luau script'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// One of the three format choices.
function FormatCard({
  title,
  description,
  selected = false,
  disabled = false,
  badge,
  onSelect,
}: {
  title: string
  description: string
  selected?: boolean
  disabled?: boolean
  badge?: string
  onSelect?: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`rounded-lg p-3 text-left ring-1 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${
        selected
          ? 'bg-accent-soft ring-accent'
          : 'bg-raised ring-line enabled:hover:bg-hover'
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-medium text-ink">
        {title}
        {badge && (
          <span className="rounded bg-hover px-1.5 py-0.5 text-[10px] text-muted">
            {badge}
          </span>
        )}
      </span>
      <span className="mt-0.5 block text-xs text-muted">{description}</span>
    </button>
  )
}

// The warnings (things that will look wrong), then notes (worth knowing),
// each with a way to jump to the element.
function ThingsToCheck({
  warnings,
  onShow,
}: {
  warnings: Warning[]
  onShow: (warning: Warning, device?: keyof typeof DEVICES) => void
}) {
  const problems = warnings.filter((w) => w.level === 'warning')
  const notes = warnings.filter((w) => w.level === 'info')
  if (warnings.length === 0) {
    return (
      <p className="rounded-lg bg-raised p-3 text-sm text-muted ring-1 ring-line">
        ✓ Nothing to check. Ready for Studio.
      </p>
    )
  }
  return (
    <div
      className={`max-h-56 space-y-2 overflow-y-auto rounded-lg p-3 ring-1 ${
        problems.length > 0 ? 'bg-warn/5 ring-warn/30' : 'bg-raised ring-line'
      }`}
    >
      {problems.length > 0 && (
        <p className="text-sm font-semibold text-warn">
          {problems.length} thing{problems.length === 1 ? '' : 's'} to check
        </p>
      )}
      {[...problems, ...notes].map((warning) => (
        <p
          key={warning.key}
          className={`text-xs ${warning.level === 'warning' ? 'text-ink' : 'text-muted'}`}
        >
          {warning.level === 'info' && 'ⓘ '}
          {warning.message}{' '}
          {warning.nodeId && (
            <LinkButton onClick={() => onShow(warning)}>Show</LinkButton>
          )}
          {warning.devices?.map((device) => (
            <span key={device}>
              {' · '}
              <LinkButton onClick={() => onShow(warning, device)}>
                Preview on {DEVICES[device].label}
              </LinkButton>
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}

function LinkButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-accent-hover underline underline-offset-2 hover:text-ink"
    >
      {children}
    </button>
  )
}

// Step-by-step instructions for getting the export into Studio.
function StudioSteps({
  format,
  fileName,
}: {
  format: Format
  fileName: string
}) {
  const steps =
    format === 'rbxmx'
      ? [
          <>
            Open the Explorer and find <b>StarterGui</b>.
          </>,
          <>
            Right-click it and choose <b>Insert from File…</b>
          </>,
          <>
            Pick <b>{fileName}</b>. It appears as a ScreenGui you can edit like
            any other.
          </>,
          <>
            Press <b>Play</b> to see it in game.
          </>,
        ]
      : [
          <>
            Open the <b>View</b> tab and click <b>Command Bar</b>.
          </>,
          <>Paste the script into the bar at the bottom of Studio.</>,
          <>
            Press <b>Enter</b>. The ScreenGui appears in StarterGui, already
            selected.
          </>,
          <>
            Press <b>Play</b> to see it in game.
          </>,
        ]
  return (
    <div className="flex flex-col rounded-lg bg-app p-4 ring-1 ring-line">
      <p className="mb-2 text-sm font-semibold">Then, in Roblox Studio</p>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted marker:text-faint">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      <p className="mt-auto border-t border-line pt-3 text-xs text-faint">
        {format === 'rbxmx'
          ? 'Dragging the file into the viewport works too, but move it into StarterGui afterwards.'
          : 'The script only adds things: it never changes or deletes what’s already in your game.'}
      </p>
    </div>
  )
}
