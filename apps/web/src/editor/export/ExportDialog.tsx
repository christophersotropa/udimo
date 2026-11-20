import { type ReactNode, useMemo, useState } from 'react'
import { documentToLuau } from '../../export/luau.ts'
import { documentForExport } from '../../export/options.ts'
import { documentToRbxmx } from '../../export/rbxmx.ts'
import { downloadTextFile } from '../../lib/download.ts'
import { measureTextWidth } from '../../lib/text.ts'
import { fontCss } from '../../model/fonts.ts'
import {
  exportWarnings,
  type MeasureText,
  type Warning,
} from '../../model/warnings.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { screenOf, useViewStore } from '../../store/viewStore.ts'
import { CloseIcon } from '../panels/icons.tsx'
import { fileBaseName } from '../topbar/projectFiles.ts'
import { Button, IconButton } from '../ui/Button.tsx'
import { Checkbox } from '../ui/Checkbox.tsx'
import { Dialog } from '../ui/Dialog.tsx'

type Format = 'rbxmx' | 'luau'

// Measures text in the browser with the element's real font, so "won't
// fit" checks are as accurate as the canvas.
const measure: MeasureText = (text, font, size) =>
  measureTextWidth(text, fontCss(font, size))

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
  buttonScript: boolean
  fileName: string | null
}

// The export dialog: choose a format, set the options, check the warnings,
// then download the file or copy the script.
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
    buttonScript: false,
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
  const { format, convertToScale, keepOnRespawn, buttonScript, fileName } =
    settings
  const [copied, setCopied] = useState(false)
  const doc = useDocumentStore((state) => state.document)
  const screen = useViewStore(screenOf)
  const rootName = doc.nodes[doc.rootId].name
  // The file name box starts as the ScreenGui's name until you type in it.
  const name = fileName ?? fileBaseName(doc)
  const file = `${safeFileName(name)}.rbxmx`

  // What would actually be exported, and its checks. useMemo: worked out
  // again only when the document or an option changes.
  const exported = useMemo(
    () => documentForExport(doc, { convertToScale, screen }),
    [doc, convertToScale, screen],
  )
  const warnings = useMemo(() => exportWarnings(exported, measure), [exported])
  const options = { resetOnSpawn: !keepOnRespawn, buttonScript }
  const instances = Object.keys(doc.nodes).length - 1
  const buttons = Object.values(doc.nodes).filter(
    (node) =>
      node.className === 'TextButton' || node.className === 'ImageButton',
  ).length

  function download() {
    downloadTextFile(
      file,
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

  // A check's link takes you to the problem: selects the element, and for
  // device problems switches to that device first.
  function show(warning: Warning) {
    const device = warning.devices?.[warning.devices.length - 1]
    if (device) useViewStore.getState().setDevice(device)
    if (warning.nodeId) useDocumentStore.getState().select(warning.nodeId)
    onClose()
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line py-2.5 pr-3 pl-5">
        <h2 className="flex items-baseline gap-2">
          <span className="text-title font-semibold">Export</span>
          <span className="font-mono text-xs text-muted">
            {rootName} · {instances} instance{instances === 1 ? '' : 's'}
          </span>
        </h2>
        <IconButton label="Close" onClick={onClose}>
          <CloseIcon size={14} />
        </IconButton>
      </div>

      <div className="grid grid-cols-2">
        {/* Left: format, file name, options */}
        <div className="space-y-5 border-r border-line p-5">
          <div className="space-y-2" role="radiogroup" aria-label="Format">
            <Label>Format</Label>
            <FormatCard
              selected={format === 'rbxmx'}
              onSelect={() => change({ format: 'rbxmx' })}
              title=".rbxmx model file"
              description="Insert into StarterGui from Studio"
            />
            <FormatCard
              selected={format === 'luau'}
              onSelect={() => change({ format: 'luau' })}
              title="Luau builder script"
              description="Paste into Studio's Command Bar"
            />
          </div>

          {format === 'rbxmx' && (
            <label className="block space-y-2">
              <Label>File name</Label>
              <span className="flex h-8 items-stretch rounded bg-app ring-1 ring-line focus-within:ring-accent">
                <input
                  value={name}
                  onChange={(event) => change({ fileName: event.target.value })}
                  className="min-w-0 flex-1 bg-transparent px-2.5 font-mono text-body outline-none"
                />
                <span className="flex items-center border-l border-line px-2.5 font-mono text-xs text-muted">
                  .rbxmx
                </span>
              </span>
            </label>
          )}

          <div className="space-y-3">
            <Checkbox
              checked={convertToScale}
              onChange={(on) => change({ convertToScale: on })}
              description="Same layout on phone, tablet and desktop"
            >
              Convert Offset to Scale
            </Checkbox>
            <Checkbox
              checked={keepOnRespawn}
              onChange={(on) => change({ keepOnRespawn: on })}
              description="GUI stays open after the player respawns"
            >
              <span className="font-mono text-xs">ResetOnSpawn = false</span>
            </Checkbox>
            <Checkbox
              checked={buttonScript}
              onChange={(on) => change({ buttonScript: on })}
              description={
                buttons > 0
                  ? `Empty handlers for each button (${buttons})`
                  : 'Empty handlers for each button (none yet)'
              }
            >
              Include LocalScript stubs
            </Checkbox>
          </div>
        </div>

        {/* Right: what to do in Studio, and the checks */}
        <div className="space-y-5 p-5">
          <div className="space-y-2">
            <Label>In Roblox Studio</Label>
            <ol className="space-y-2 text-body">
              {(format === 'rbxmx'
                ? [
                    <>
                      Open the Explorer and find <Code>StarterGui</Code>.
                    </>,
                    <>
                      Right-click it, then choose <Code>Insert from File…</Code>
                      .
                    </>,
                    <>
                      Pick <Code>{file}</Code>. It arrives as a normal
                      ScreenGui.
                    </>,
                    <>Press Play to test it in game.</>,
                  ]
                : [
                    <>
                      Open the <Code>View</Code> tab and click{' '}
                      <Code>Command Bar</Code>.
                    </>,
                    <>Paste the script into the bar.</>,
                    <>
                      Press Enter. It lands in <Code>StarterGui</Code>,
                      selected.
                    </>,
                    <>Press Play to test it in game.</>,
                  ]
              ).map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-ink">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <Checks warnings={warnings} onShow={show} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3">
        <p className="text-xs text-muted">
          Generated in your browser. Nothing is uploaded.
        </p>
        <div className="flex gap-2">
          <Button onClick={onClose}>Cancel</Button>
          {format === 'rbxmx' ? (
            <Button variant="primary" onClick={download}>
              Download {file}
            </Button>
          ) : (
            <Button variant="primary" onClick={copy} className="min-w-36">
              {copied ? 'Copied!' : 'Copy Luau script'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>
}

// A bit of Studio's interface named in the steps, like StarterGui.
function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-sm bg-raised px-1 py-px font-mono text-xs text-ink ring-1 ring-line">
      {children}
    </code>
  )
}

// One format choice: a card with a radio dot.
function FormatCard({
  title,
  description,
  selected,
  onSelect,
}: {
  title: string
  description: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded p-3 text-left ring-1 focus-visible:outline-2 focus-visible:outline-accent ${
        selected ? 'bg-accent-soft ring-accent' : 'ring-line hover:bg-hover'
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full ring-1 ${
          selected ? 'ring-accent' : 'ring-muted'
        }`}
      >
        {selected && <span className="size-2 rounded-full bg-accent" />}
      </span>
      <span>
        <span
          className={`block text-body font-semibold ${selected ? 'text-accent' : 'text-ink'}`}
        >
          {title}
        </span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
    </button>
  )
}

// The checks: warnings first (things that will look wrong), then notes,
// each showing where (its path), what, and a link to it.
function Checks({
  warnings,
  onShow,
}: {
  warnings: Warning[]
  onShow: (warning: Warning) => void
}) {
  const problems = warnings.filter((w) => w.level === 'warning')
  const notes = warnings.filter((w) => w.level === 'info')
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label>Checks</Label>
        <span className="font-mono text-xs text-muted">
          {problems.length} warning{problems.length === 1 ? '' : 's'}
          {notes.length > 0 &&
            ` · ${notes.length} note${notes.length === 1 ? '' : 's'}`}
        </span>
      </div>
      {warnings.length === 0 ? (
        <p className="border-t border-line pt-2 text-body text-muted">
          ✓ Nothing to fix. Ready for Studio.
        </p>
      ) : (
        <ul className="max-h-60 overflow-y-auto">
          {[...problems, ...notes].map((warning) => (
            <li
              key={warning.key}
              className="flex gap-2.5 border-t border-line py-2"
            >
              <span
                aria-hidden="true"
                className={
                  warning.level === 'warning' ? 'text-warn' : 'text-muted'
                }
              >
                {warning.level === 'warning' ? '⚠' : 'ⓘ'}
              </span>
              <span className="min-w-0 flex-1">
                {warning.path && (
                  <span className="block truncate font-mono text-xs text-ink">
                    {warning.path}
                  </span>
                )}
                <span className="block text-xs text-muted">
                  {warning.message}
                </span>
              </span>
              {warning.nodeId && (
                <button
                  type="button"
                  onClick={() => onShow(warning)}
                  className="self-start text-xs text-accent underline underline-offset-2 hover:text-accent-hover"
                >
                  {warning.devices
                    ? 'Preview'
                    : warning.key.startsWith('image:')
                      ? 'Fix'
                      : 'Show'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
