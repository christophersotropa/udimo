import { Fragment } from 'react'
import { createPetInventoryDocument } from '../../app/petInventory.ts'
import { createSampleDocument } from '../../app/sampleDocument.ts'
import { createEmptyDocument } from '../../model/document.ts'
import { DEVICES, type DeviceId } from '../../model/screen.ts'
import { type ElementClassName } from '../../store/documentStore.ts'
import { useViewStore } from '../../store/viewStore.ts'
import { actions, can, selectionHidden, selectionLocked } from '../actions.ts'
import { MenuItem, MenuSeparator, Popover } from '../ui/Popover.tsx'
import { pickProjectFile, saveProject, startFrom } from './projectFiles.ts'

// One menu entry: what it says, its shortcut, what it does, and whether it
// can be used / is ticked right now (checked when the menu opens).
type Entry = {
  label: string
  shortcut?: string
  run: () => void
  enabled?: () => boolean
  checked?: () => boolean
}
type Menu = { title: string; entries: (Entry | 'separator')[] }

const INSERTABLE: ElementClassName[] = [
  'Frame',
  'TextLabel',
  'TextButton',
  'TextBox',
  'ImageLabel',
  'ImageButton',
  'ScrollingFrame',
]

// The menus across the top: File, Edit, View, Insert, Arrange.
export function MenuBar() {
  const view = () => useViewStore.getState()
  const menus: Menu[] = [
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
        {
          label: 'Redo',
          shortcut: '⇧⌘Z',
          run: actions.redo,
          enabled: can.redo,
        },
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
        ...(Object.keys(DEVICES) as DeviceId[]).map((id) => ({
          label: DEVICES[id].label,
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
      title: 'Insert',
      entries: [
        ...INSERTABLE.map((className) => ({
          label: className,
          run: () => actions.insert(className),
        })),
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
          label: 'Hide',
          shortcut: '⇧⌘H',
          run: actions.toggleHidden,
          enabled: can.editSelection,
        },
        {
          label: 'Lock',
          shortcut: '⇧⌘L',
          run: actions.toggleLocked,
          enabled: can.editSelection,
        },
      ],
    },
  ]

  return (
    <nav aria-label="Menu" className="flex items-center">
      {menus.map((menu) => (
        <Popover
          key={menu.title}
          width="w-60"
          trigger={({ open, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="menu"
              className={`h-7 rounded px-2.5 text-[13px] focus-visible:outline-2 focus-visible:outline-accent ${
                open
                  ? 'bg-hover text-ink'
                  : 'text-muted hover:bg-hover hover:text-ink'
              }`}
            >
              {menu.title}
            </button>
          )}
        >
          {(close) =>
            menu.entries.map((entry, i) =>
              entry === 'separator' ? (
                <MenuSeparator key={i} />
              ) : (
                <Fragment key={entry.label}>
                  <MenuItem
                    shortcut={entry.shortcut}
                    disabled={entry.enabled ? !entry.enabled() : false}
                    checked={entry.checked?.()}
                    onClick={() => {
                      close()
                      entry.run()
                    }}
                  >
                    {/* Hide and Lock say Show / Unlock when that's what
                        they'd do. */}
                    {entry.label === 'Hide' && selectionHidden()
                      ? 'Show'
                      : entry.label === 'Lock' && selectionLocked()
                        ? 'Unlock'
                        : entry.label}
                  </MenuItem>
                </Fragment>
              ),
            )
          }
        </Popover>
      ))}
    </nav>
  )
}
