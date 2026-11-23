import { downloadTextFile } from '../../lib/download.ts'
import {
  ProjectFileError,
  parseProject,
  serializeProject,
} from '../../model/project.ts'
import { summarize } from '../../import/summary.ts'
import { importRbxmx, RbxmxError } from '../../import/toDocument.ts'
import type { UiDocument } from '../../model/types.ts'
import { pasteFragment } from '../../store/commands.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { useViewStore } from '../../store/viewStore.ts'
import { confirmReplace } from '../panels/confirmReplace.ts'

// Opening and saving project files (.udimo.json), and replacing the
// document with a starter. They read the store when called, so menus that
// use them don't re-render on every edit.

// Anything bigger isn't a project Udimo made. Checked before reading the
// file, so picking a huge file by mistake can't freeze the tab.
const MAX_PROJECT_BYTES = 5 * 1024 * 1024 // 5 MB

// A file name from the ScreenGui's name, with odd characters swapped for _.
export function fileBaseName(doc: UiDocument): string {
  return doc.nodes[doc.rootId].name.replace(/[^\w-]/g, '_') || 'ScreenGui'
}

export function saveProject() {
  const doc = useDocumentStore.getState().document
  downloadTextFile(
    `${fileBaseName(doc)}.udimo.json`,
    serializeProject(doc),
    'application/json',
  )
}

export async function openProjectFile(file: File) {
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

// Replaces the document with a fresh one (asking first).
export function startFrom(make: () => UiDocument) {
  if (confirmReplace()) useDocumentStore.getState().loadDocument(make())
}

// Asks for a project file to open, with the browser's file picker. The
// picker is a file <input> made just for this and clicked from code, so
// menus and shortcuts can both use it.
export function pickProjectFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) void openProjectFile(file)
  })
  input.click()
}

// ---------- Importing from Roblox Studio ----------

// A model file this big is far beyond any GUI; refusing it before reading
// keeps a wrong pick from freezing the tab.
const MAX_MODEL_BYTES = 20 * 1024 * 1024 // 20 MB

// Imports an .rbxmx file saved from Studio (import/toDocument.ts).
// A ScreenGui replaces the design (asking first, like Open); elements saved
// without one (a Frame on its own) are added to the current design, like a
// paste, as one undo step. Afterwards the Import dialog says what came in
// and what was left out, or a short status-bar message says it when
// nothing was left out. A file that can't be imported explains why in the
// dialog.
export async function importRbxmxFile(file: File) {
  const view = useViewStore.getState()
  const fail = (message: string) =>
    view.setImportReport({
      title: `Couldn’t import ${file.name}`,
      summary: '',
      skipped: [],
      notes: [],
      error: message,
    })
  if (file.size > MAX_MODEL_BYTES) {
    fail('That file is too big to be a GUI.')
    return
  }

  let result
  try {
    result = importRbxmx(await file.text())
  } catch (error) {
    fail(error instanceof RbxmxError ? error.message : 'It could not be read.')
    return
  }

  let addedNames: string[] = []
  if (result.wrapped) {
    const fragment = result.document
    addedNames = fragment.nodes[fragment.rootId].children.map(
      (id) => fragment.nodes[id].name,
    )
    pasteFragment(useDocumentStore, fragment)
  } else {
    if (!confirmReplace()) return
    useDocumentStore.getState().loadDocument(result.document)
  }

  const summary = summarize(result, addedNames)
  if (summary.skipped.length === 0 && summary.notes.length === 0) {
    view.showNotice(`${summary.title}: ${summary.summary}`)
  } else {
    view.setImportReport(summary)
  }
}

// Asks for an .rbxmx file with the browser's file picker (like
// pickProjectFile). .rbxm is allowed too, so picking the binary kind by
// mistake gets an explanation instead of a greyed-out file.
export function pickRbxmxFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.rbxmx,.rbxm'
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) void importRbxmxFile(file)
  })
  input.click()
}
