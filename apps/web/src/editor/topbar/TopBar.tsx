import { type ReactNode, useState } from 'react'
import { DEVICES, type DeviceId } from '../../model/screen.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { type Tool, useViewStore } from '../../store/viewStore.ts'
import { ExportDialog } from '../export/ExportDialog.tsx'
import {
  ButtonToolIcon,
  CursorIcon,
  DownloadIcon,
  FrameToolIcon,
  HandIcon,
  ImageToolIcon,
  TextToolIcon,
  RedoIcon,
  UndoIcon,
} from '../panels/icons.tsx'
import { Button, IconButton } from '../ui/Button.tsx'
import { SegmentedControl } from '../ui/SegmentedControl.tsx'
import { MainMenu } from './MainMenu.tsx'

// The bar across the top, in three parts: the menu and the design's name on
// the left, the tools in the middle, and undo/redo, the device and Export
// on the right. The middle column is "auto" between two equal "1fr"
// columns, which keeps the tools centered whatever the sides hold.
export function TopBar() {
  const [exporting, setExporting] = useState(false)

  return (
    <header className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line bg-panel px-3">
      <div className="flex min-w-0 items-center gap-3">
        <MainMenu />
        <span className="h-5 w-px bg-line" />
        <DocumentTitle />
      </div>

      <Tools />

      <div className="flex items-center justify-end gap-2">
        <History />
        <DeviceTabs />
        <Button
          variant="primary"
          icon={<DownloadIcon />}
          onClick={() => setExporting(true)}
        >
          Export
        </Button>
      </div>

      <ExportDialog open={exporting} onClose={() => setExporting(false)} />
    </header>
  )
}

// What autosave is doing, in plain words. 'off' means the browser blocks
// storage, so nothing is being kept: saying "Saved" then would be a lie.
const SAVE_NOTES = {
  saved: { text: 'Saved in this browser', warn: false },
  saving: { text: 'Saving…', warn: false },
  failed: { text: 'Couldn’t save: browser storage is full', warn: true },
  off: { text: 'Not saved: this browser blocks storage', warn: true },
}

// The ScreenGui's name and whether your work is saved.
function DocumentTitle() {
  const name = useDocumentStore(
    (state) => state.document.nodes[state.document.rootId].name,
  )
  const status = useViewStore((state) => state.saveStatus)
  const note = SAVE_NOTES[status]
  return (
    <p className="flex min-w-0 items-baseline gap-1.5 text-sm">
      <span className="truncate font-medium text-ink">{name}</span>
      <span
        className={`truncate text-xs ${note.warn ? 'text-warn' : 'text-faint'}`}
      >
        · {note.text}
      </span>
    </p>
  )
}

// The draw tools: icon, name and shortcut key.
const DRAW_TOOL_BUTTONS: {
  tool: Tool
  label: string
  icon: ReactNode
}[] = [
  {
    tool: 'frame',
    label: 'Frame (F): drag to draw',
    icon: <FrameToolIcon size={16} />,
  },
  {
    tool: 'text',
    label: 'Text (T): drag to draw a TextLabel',
    icon: <TextToolIcon size={16} />,
  },
  {
    tool: 'button',
    label: 'Button (B): drag to draw a TextButton',
    icon: <ButtonToolIcon size={16} />,
  },
  {
    tool: 'image',
    label: 'Image (I): drag to draw an ImageLabel',
    icon: <ImageToolIcon size={16} />,
  },
]

// The canvas tools: select, then the four draw tools, then pan.
function Tools() {
  const tool = useViewStore((state) => state.tool)
  const setTool = useViewStore((state) => state.setTool)
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-app p-0.5 ring-1 ring-line">
      <IconButton
        label="Select and move (V)"
        active={tool === 'select'}
        onClick={() => setTool('select')}
      >
        <CursorIcon size={16} />
      </IconButton>
      <span className="mx-0.5 h-5 w-px bg-line" />
      {DRAW_TOOL_BUTTONS.map((button) => (
        <IconButton
          key={button.tool}
          label={button.label}
          active={tool === button.tool}
          onClick={() => setTool(button.tool)}
        >
          {button.icon}
        </IconButton>
      ))}
      <span className="mx-0.5 h-5 w-px bg-line" />
      <IconButton
        label="Pan the view (H, or hold Space)"
        active={tool === 'hand'}
        onClick={() => setTool('hand')}
      >
        <HandIcon size={16} />
      </IconButton>
    </div>
  )
}

function History() {
  // These re-render only when undo or redo becomes (un)available.
  const canUndo = useDocumentStore((state) => state.past.length > 0)
  const canRedo = useDocumentStore((state) => state.future.length > 0)
  const { undo, redo } = useDocumentStore.getState()
  return (
    <div className="flex gap-0.5">
      <IconButton label="Undo (⌘Z)" onClick={undo} disabled={!canUndo}>
        <UndoIcon size={16} />
      </IconButton>
      <IconButton label="Redo (⇧⌘Z)" onClick={redo} disabled={!canRedo}>
        <RedoIcon size={16} />
      </IconButton>
    </div>
  )
}

function DeviceTabs() {
  const device = useViewStore((state) => state.device)
  const setDevice = useViewStore((state) => state.setDevice)
  return (
    <SegmentedControl<DeviceId>
      label="Device"
      value={device}
      onChange={setDevice}
      options={(Object.keys(DEVICES) as DeviceId[]).map((id) => ({
        value: id,
        label: DEVICES[id].label,
      }))}
    />
  )
}
