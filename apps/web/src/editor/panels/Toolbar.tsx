import { type ChangeEvent, useRef } from 'react'
import { documentToRbxmx } from '../../export/rbxmx.ts'
import { downloadTextFile } from '../../lib/download.ts'
import { createEmptyDocument } from '../../model/document.ts'
import {
  ProjectFileError,
  parseProject,
  serializeProject,
} from '../../model/project.ts'
import type { UiDocument } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'

// Anything bigger isn't a project Udimo made. Checked before reading the
// file, so picking a huge file by mistake can't freeze the tab.
const MAX_PROJECT_BYTES = 5 * 1024 * 1024 // 5 MB

// These read the document at click time (getState), so the toolbar doesn't
// re-render every time the document changes.

// Files are named after the ScreenGui, with odd characters swapped for _.
function fileBaseName(doc: UiDocument): string {
  return doc.nodes[doc.rootId].name.replace(/[^\w-]/g, '_') || 'ScreenGui'
}

function downloadRbxmx() {
  const doc = useDocumentStore.getState().document
  downloadTextFile(
    `${fileBaseName(doc)}.rbxmx`,
    documentToRbxmx(doc),
    'application/xml',
  )
}

function saveProject() {
  const doc = useDocumentStore.getState().document
  downloadTextFile(
    `${fileBaseName(doc)}.udimo.json`,
    serializeProject(doc),
    'application/json',
  )
}

// Replacing the document also clears undo, so ask first, unless there's
// nothing to lose (an empty ScreenGui).
function confirmReplace(): boolean {
  const doc = useDocumentStore.getState().document
  if (doc.nodes[doc.rootId].children.length === 0) return true
  return window.confirm(
    'This replaces your current design, and it can’t be undone. ' +
      'Use Save first if you want to keep it. Continue?',
  )
}

function newProject() {
  if (confirmReplace()) {
    useDocumentStore.getState().loadDocument(createEmptyDocument())
  }
}

async function openProjectFile(file: File) {
  if (file.size > MAX_PROJECT_BYTES) {
    window.alert('That file is too big to be an Udimo project.')
    return
  }
  try {
    // Check the file before asking, so you're never asked about a file
    // that then fails to open.
    const doc = parseProject(await file.text())
    if (confirmReplace()) useDocumentStore.getState().loadDocument(doc)
  } catch (error) {
    const reason =
      error instanceof ProjectFileError
        ? error.message
        : 'It could not be read.'
    window.alert(`Couldn’t open ${file.name}. ${reason}`)
  }
}

const toolButtonClass =
  'rounded px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-blue-500'

// The bar across the top.
export function Toolbar() {
  // These re-render the toolbar only when undo or redo becomes (un)available.
  const canUndo = useDocumentStore((state) => state.past.length > 0)
  const canRedo = useDocumentStore((state) => state.future.length > 0)
  const undo = useDocumentStore((state) => state.undo)
  const redo = useDocumentStore((state) => state.redo)
  // A hidden file picker. The Open button clicks it, because a real
  // <input type="file"> can't be styled like the other buttons.
  const fileInputRef = useRef<HTMLInputElement>(null)

  function onFilePicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Clear it, so picking the same file again still counts as a change.
    event.target.value = ''
    if (file) void openProjectFile(file)
  }

  return (
    <header className="flex h-11 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold">Udimo</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={newProject}
            title="Start an empty ScreenGui"
            className={toolButtonClass}
          >
            New
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Open a .udimo.json project file"
            className={toolButtonClass}
          >
            Open…
          </button>
          <button
            type="button"
            onClick={saveProject}
            title="Download the project as a .udimo.json file"
            className={toolButtonClass}
          >
            Save
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={onFilePicked}
            hidden
          />
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (⌘Z / Ctrl+Z)"
            className={toolButtonClass}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (⇧⌘Z / Ctrl+Y)"
            className={toolButtonClass}
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
