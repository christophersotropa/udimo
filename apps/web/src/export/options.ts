import { planUnitConversion } from '../model/responsive.ts'
import type { ScreenSize } from '../model/screen.ts'
import type { UiDocument } from '../model/types.ts'
import { convertUnits } from '../store/commands.ts'
import { createDocumentStore } from '../store/documentStore.ts'

// Choices made in the export dialog. They change the exported copy only,
// never the design you're editing.
export type ExportOptions = {
  // ScreenGui.ResetOnSpawn. Roblox's default (true) rebuilds the GUI every
  // time the player respawns, losing anything a script changed in it.
  resetOnSpawn: boolean
  // Turn every Position and Size into Scale ("Make responsive") on the way
  // out, measured on `screen`, so the GUI grows and shrinks with any screen.
  convertToScale: boolean
  screen: ScreenSize
}

// Like Studio: ResetOnSpawn on, sizes exactly as designed.
export const STUDIO_DEFAULTS: Pick<
  ExportOptions,
  'resetOnSpawn' | 'convertToScale'
> = {
  resetOnSpawn: true,
  convertToScale: false,
}

// The document to export: a converted copy when convertToScale is on,
// otherwise the document itself.
export function documentForExport(
  doc: UiDocument,
  options: Pick<ExportOptions, 'convertToScale' | 'screen'>,
): UiDocument {
  if (!options.convertToScale) return doc
  // A throwaway store, so the conversion follows the same rules as the
  // "Make responsive" button, without touching the editor's own store.
  const copy = createDocumentStore(doc)
  const topLevel = doc.nodes[doc.rootId].children
  if (planUnitConversion(doc, topLevel, 'scale', options.screen).size === 0) {
    return doc
  }
  convertUnits(copy, topLevel, 'scale', options.screen)
  return copy.getState().document
}
