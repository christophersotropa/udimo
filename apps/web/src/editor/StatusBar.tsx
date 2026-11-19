import { useShallow } from 'zustand/react/shallow'
import { absoluteBox } from '../model/layout.ts'
import { useDocumentStore } from '../store/documentStore.ts'
import { currentView, screenOf, useViewStore } from '../store/viewStore.ts'

// What autosave is doing, in a few words. 'off' means the browser blocks
// storage, so nothing is being kept: saying "Saved" then would be a lie.
const SAVE_NOTES = {
  saved: { text: 'Saved locally', warn: false },
  saving: { text: 'Saving…', warn: false },
  failed: { text: 'Couldn’t save: storage full', warn: true },
  off: { text: 'Not saved: storage blocked', warn: true },
}

// The bar along the bottom. Left: what's selected, its size and position
// in pixels. Right: snapping (click to toggle), zoom (click to fit), and
// whether your work is saved.
export function StatusBar() {
  const screen = useViewStore(screenOf)
  const snapping = useViewStore((state) => state.snapping)
  const zoom = useViewStore(useShallow((state) => currentView(state).zoom))
  const status = useViewStore((state) => state.saveStatus)
  const { setSnapping, fit } = useViewStore.getState()
  const note = SAVE_NOTES[status]

  const selected = useDocumentStore(
    useShallow((state) => {
      const { document, selection } = state
      if (selection.length > 1) return { many: selection.length }
      const id = selection[0] ?? document.rootId
      const node = document.nodes[id]
      if (!node) return null
      const box = absoluteBox(document, id, screen)
      return {
        name: node.name,
        className: node.className,
        width: Math.round(box.width),
        height: Math.round(box.height),
        x: Math.round(box.x),
        y: Math.round(box.y),
      }
    }),
  )

  return (
    <footer className="flex h-7 items-center justify-between gap-4 border-t border-line bg-panel px-3 font-mono text-[11px] text-muted">
      <p className="flex min-w-0 items-center gap-3 truncate">
        {selected && 'many' in selected ? (
          <span>{selected.many} selected</span>
        ) : selected ? (
          <>
            <span className="truncate text-ink">
              {selected.name} · {selected.className}
            </span>
            <Divider />
            <span>
              {selected.width} × {selected.height} px
            </span>
            <Divider />
            <span>
              x {selected.x} y {selected.y}
            </span>
          </>
        ) : null}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSnapping(!snapping)}
          title="Snap to the parent and siblings while dragging (hold ⌘ to skip once)"
          className="hover:text-ink"
        >
          Snap {snapping ? 'on' : 'off'}
        </button>
        <Divider />
        <button
          type="button"
          onClick={fit}
          title="Zoom to fit (⌘0)"
          className="tabular-nums hover:text-ink"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Divider />
        <span className={note.warn ? 'text-warn' : undefined}>{note.text}</span>
      </div>
    </footer>
  )
}

function Divider() {
  return <span className="h-3 w-px bg-line" />
}
