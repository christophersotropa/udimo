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

// The bar across the top. Undo/redo buttons go here later.
export function Toolbar() {
  return (
    <header className="flex h-11 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4">
      <span className="text-sm font-semibold">Udimo</span>
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
