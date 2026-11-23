import { createPetInventoryDocument } from '../../app/petInventory.ts'
import { createSampleDocument } from '../../app/sampleDocument.ts'
import { createEmptyDocument } from '../../model/document.ts'
import { DEVICES, type DeviceId } from '../../model/screen.ts'
import { useViewStore } from '../../store/viewStore.ts'
import { actions, can, selectionHidden, selectionLocked } from '../actions.ts'
import { pickProjectFile, saveProject, startFrom } from './projectFiles.ts'

// Every action the top bar offers, as plain data: the Udimo menu
// (AppMenu.tsx) shows them as menus, and the command field
// (CommandBar.tsx) searches them. Keeping one list means a name or a
// shortcut can't differ between the two.

// One action: what it says, its shortcut, what it does, and whether it can
// be used / is ticked right now. `label` is a function for the few whose
// wording changes ("Hide" says "Show" when that's what it would do).
export type MenuEntry = {
  label: string | (() => string)
  shortcut?: string
  run: () => void
  enabled?: () => boolean
  checked?: () => boolean
}
export type Menu = { title: string; entries: (MenuEntry | 'separator')[] }

export const labelOf = (entry: MenuEntry): string =>
  typeof entry.label === 'function' ? entry.label() : entry.label

const view = () => useViewStore.getState()

// Inserting isn't here: the Insert menu and the command field both list
// the insert catalog (model/catalog.ts) themselves, modifiers included.
export const MENUS: Menu[] = [
  {
    title: 'File',
    entries: [
      {
        label: 'New empty ScreenGui',
        run: () => startFrom(createEmptyDocument),
      },
      {
        label: 'New from Shop example',
        run: () => startFrom(createSampleDocument),
      },
      {
        label: 'New from Pet Inventory example',
        run: () => startFrom(createPetInventoryDocument),
      },
      'separator',
      { label: 'Open project…', shortcut: '⌘O', run: pickProjectFile },
      { label: 'Save project', shortcut: '⌘S', run: saveProject },
      'separator',
      { label: 'Export…', shortcut: '⌘E', run: actions.openExport },
    ],
  },
  {
    title: 'Edit',
    entries: [
      { label: 'Undo', shortcut: '⌘Z', run: actions.undo, enabled: can.undo },
      { label: 'Redo', shortcut: '⇧⌘Z', run: actions.redo, enabled: can.redo },
      'separator',
      {
        label: 'Cut',
        shortcut: '⌘X',
        run: actions.cut,
        enabled: can.editSelection,
      },
      {
        label: 'Copy',
        shortcut: '⌘C',
        run: actions.copy,
        enabled: can.editSelection,
      },
      {
        label: 'Paste',
        shortcut: '⌘V',
        run: actions.paste,
        enabled: can.paste,
      },
      {
        label: 'Paste Into',
        shortcut: '⇧⌘V',
        run: actions.pasteInto,
        enabled: can.paste,
      },
      {
        label: 'Duplicate',
        shortcut: '⌘D',
        run: actions.duplicate,
        enabled: can.editSelection,
      },
      {
        label: 'Delete',
        shortcut: '⌫',
        run: actions.delete,
        enabled: can.editSelection,
      },
      'separator',
      { label: 'Select All', shortcut: '⌘A', run: actions.selectAll },
      {
        label: 'Rename',
        shortcut: 'F2',
        run: actions.rename,
        enabled: can.rename,
      },
    ],
  },
  {
    title: 'View',
    entries: [
      { label: 'Zoom In', shortcut: '⌘+', run: actions.zoomIn },
      { label: 'Zoom Out', shortcut: '⌘−', run: actions.zoomOut },
      { label: 'Zoom to 100%', run: actions.zoomTo100 },
      { label: 'Zoom to Fit', shortcut: '⌘0', run: actions.fit },
      'separator',
      ...(Object.keys(DEVICES) as DeviceId[]).map((id): MenuEntry => ({
        label: `${DEVICES[id].label} preview`,
        run: () => view().setDevice(id),
        checked: () => view().device === id,
      })),
      'separator',
      {
        label: 'Snap to Guides',
        run: actions.toggleSnapping,
        checked: () => view().snapping,
      },
      'separator',
      { label: 'Swap Panel Sides', run: actions.swapPanels },
      { label: 'Reset Panel Layout', run: actions.resetPanels },
    ],
  },
  {
    title: 'Arrange',
    entries: [
      {
        label: 'Group as Frame',
        shortcut: '⌘G',
        run: actions.group,
        enabled: can.group,
      },
      'separator',
      {
        label: 'Bring to Front',
        shortcut: '⇧⌘]',
        run: () => actions.arrange('front'),
        enabled: can.editSelection,
      },
      {
        label: 'Bring Forward',
        shortcut: '⌘]',
        run: () => actions.arrange('forward'),
        enabled: can.editSelection,
      },
      {
        label: 'Send Backward',
        shortcut: '⌘[',
        run: () => actions.arrange('backward'),
        enabled: can.editSelection,
      },
      {
        label: 'Send to Back',
        shortcut: '⇧⌘[',
        run: () => actions.arrange('back'),
        enabled: can.editSelection,
      },
      'separator',
      {
        // Says what it would do to the selection.
        label: () => (selectionHidden() ? 'Show' : 'Hide'),
        shortcut: '⇧⌘H',
        run: actions.toggleHidden,
        enabled: can.editSelection,
      },
      {
        label: () => (selectionLocked() ? 'Unlock' : 'Lock'),
        shortcut: '⇧⌘L',
        run: actions.toggleLocked,
        enabled: can.editSelection,
      },
    ],
  },
]
