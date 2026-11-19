import { useEffect, useMemo, useRef, useState } from 'react'
import { measureTextWidth } from '../../lib/text.ts'
import { FONT_WEIGHT } from '../../model/enums.ts'
import { FONTS } from '../../model/fonts.ts'
import { exportWarnings, type MeasureText } from '../../model/warnings.ts'
import { useDocumentStore } from '../../store/documentStore.ts'

// Measures text in the browser with the element's real font, so "won't fit"
// warnings are as accurate as the canvas.
const measure: MeasureText = (text, font, size) =>
  measureTextWidth(
    text,
    `${FONT_WEIGHT[font.weight]} ${size}px ${FONTS[font.family].css}`,
  )

// The warnings button in the toolbar, and the list it opens. The list is
// worked out again whenever the document changes. Clicking a warning
// selects its element.
export function ExportWarnings() {
  const doc = useDocumentStore((state) => state.document)
  // useMemo: only recompute when the document itself changes, not on
  // every redraw of the toolbar.
  const warnings = useMemo(() => exportWarnings(doc, measure), [doc])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const problems = warnings.filter((w) => w.level === 'warning').length

  // Close the list when clicking anywhere else, or pressing Escape.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title="Things worth checking before you export"
        className={`rounded px-2 py-1 text-sm ring-1 focus-visible:outline-2 focus-visible:outline-blue-500 ${
          problems > 0
            ? 'text-amber-300 ring-amber-500/40 hover:bg-amber-500/10'
            : 'text-zinc-400 ring-zinc-700 hover:bg-zinc-800'
        }`}
      >
        {problems > 0
          ? `⚠ ${problems} warning${problems === 1 ? '' : 's'}`
          : warnings.length > 0
            ? `ⓘ ${warnings.length} note${warnings.length === 1 ? '' : 's'}`
            : '✓ No warnings'}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-1 w-96 rounded-md bg-zinc-900 p-2 shadow-xl ring-1 ring-zinc-700">
          {warnings.length === 0 ? (
            <p className="p-2 text-sm text-zinc-400">
              Nothing to fix. Ready for Studio.
            </p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {warnings.map((warning) => (
                <li key={warning.key}>
                  <button
                    type="button"
                    disabled={!warning.nodeId}
                    onClick={() => {
                      if (warning.nodeId) {
                        useDocumentStore.getState().select(warning.nodeId)
                      }
                      setOpen(false)
                    }}
                    className="flex w-full gap-2 rounded p-2 text-left text-xs text-zinc-200 enabled:hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-blue-500"
                  >
                    <span
                      className={
                        warning.level === 'warning'
                          ? 'text-amber-300'
                          : 'text-sky-300'
                      }
                    >
                      {warning.level === 'warning' ? '⚠' : 'ⓘ'}
                    </span>
                    <span>{warning.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
