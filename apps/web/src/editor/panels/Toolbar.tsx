import { documentToRbxmx } from '../../export/rbxmx.ts'
import { downloadTextFile } from '../../lib/download.ts'
import { useDocumentStore } from '../../store/documentStore.ts'

// Reads the document at click time (getState), so the toolbar doesn't
// re-render every time the document changes.
function downloadRbxmx() {
  const doc = useDocumentStore.getState().document
  // The file is named after the ScreenGui, with odd characters swapped for _.
  const name = doc.nodes[doc.rootId].name.replace(/[^\w-]/g, '_') || 'ScreenGui'
  downloadTextFile(`${name}.rbxmx`, documentToRbxmx(doc))
}

const historyButtonClass =
  'rounded px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-blue-500'

// The bar across the top.
export function Toolbar() {
  // These re-render the toolbar only when undo or redo becomes (un)available.
  const canUndo = useDocumentStore((state) => state.past.length > 0)
  const canRedo = useDocumentStore((state) => state.future.length > 0)
  const undo = useDocumentStore((state) => state.undo)
  const redo = useDocumentStore((state) => state.redo)

  return (
    <header className="flex h-11 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold">Udimo</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (⌘Z / Ctrl+Z)"
            className={historyButtonClass}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (⇧⌘Z / Ctrl+Y)"
            className={historyButtonClass}
          >
            Redo
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={downloadRbxmx}
        className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
      >
        Download .rbxmx
      </button>
    </header>
  )
}
