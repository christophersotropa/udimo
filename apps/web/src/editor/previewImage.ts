import { ImageFileError, readImageFile } from '../lib/readImageFile.ts'
import { ACCEPTED_IMAGE_TYPES } from '../model/previewImages.ts'
import type { ScreenSize } from '../model/screen.ts'
import type { NodeId } from '../model/types.ts'
import { insertImageAt } from '../store/commands.ts'
import { useDocumentStore } from '../store/documentStore.ts'

// Picking a picture from your computer to preview an image element (see
// UiNode.previewImage): from the Properties panel's button, or by dropping
// a file onto the element on the canvas. Both end up here.

// Reads `file` and shows it on element `id`. Returns a message to show if
// it can't be used, else null.
export async function previewFromFile(
  id: NodeId,
  file: File,
): Promise<string | null> {
  try {
    const preview = await readImageFile(file)
    // The element may have been deleted while the file was being read.
    if (!useDocumentStore.getState().document.nodes[id]) return null
    useDocumentStore.getState().setPreviewImage(id, preview)
    return null
  } catch (error) {
    if (error instanceof ImageFileError) return error.message
    throw error
  }
}

// Reads `file` and adds a new ImageLabel showing it, centred on `point`
// (game pixels). Returns a message to show if it can't be used, else null.
export async function insertImageFromFile(
  file: File,
  point: { x: number; y: number },
  screen: ScreenSize,
): Promise<string | null> {
  try {
    insertImageAt(useDocumentStore, point, screen, await readImageFile(file))
    return null
  } catch (error) {
    if (error instanceof ImageFileError) return error.message
    throw error
  }
}

// Opens the system's file chooser for an image, then calls `onFile` with
// the one picked. (The <input type="file"> is made here in code, never
// added to the page.)
export function chooseImageFile(onFile: (file: File) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = ACCEPTED_IMAGE_TYPES.join(',')
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) onFile(file)
  })
  input.click()
}
