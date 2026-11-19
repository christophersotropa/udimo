import { downloadTextFile } from '../../lib/download.ts'
import {
  ProjectFileError,
  parseProject,
  serializeProject,
} from '../../model/project.ts'
import type { UiDocument } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
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
