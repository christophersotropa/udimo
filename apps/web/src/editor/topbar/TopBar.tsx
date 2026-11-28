import { DEVICES, type DeviceId } from '../../model/screen.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { type EditorMode, useViewStore } from '../../store/viewStore.ts'
import { ExportDialog } from '../export/ExportDialog.tsx'
import { ImportReportDialog } from '../import/ImportReportDialog.tsx'
import { CursorIcon, HandIcon } from '../panels/icons.tsx'
import { Button, IconButton } from '../ui/Button.tsx'
import { SegmentedControl } from '../ui/SegmentedControl.tsx'
import { AppMenu } from './AppMenu.tsx'
import { CommandBar } from './CommandBar.tsx'

// The bar across the top, in three parts: the Udimo menu (File, Edit,
// View, Insert, Arrange), the design's name and the Design / Logic switch
// on the left; the command field in the middle; the tools, device (on the
// Design side) and Export on the right.
// The middle column is "auto" between two equal "1fr" columns, which keeps
// the command field centered whatever the sides hold.
export function TopBar() {
  const mode = useViewStore((state) => state.mode)
  const exportOpen = useViewStore((state) => state.exportOpen)
  const setExportOpen = useViewStore((state) => state.setExportOpen)

  return (
    <header className="grid h-11 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line bg-panel px-2.5">
      <div className="flex min-w-0 items-center gap-1">
        <AppMenu />
        <DesignName />
        <ModeSwitch />
      </div>

      <CommandBar />

      <div className="flex items-center justify-end gap-2">
        {/* The tools and devices are the Design canvas's. */}
        {mode === 'design' && (
          <>
            <Tools />
            <DeviceTabs />
          </>
        )}
        <Button variant="primary" onClick={() => setExportOpen(true)}>
          Export
        </Button>
      </div>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <ImportReportDialog />
    </header>
  )
}

// "/ <ScreenGui name>", after the Udimo menu.
function DesignName() {
  const name = useDocumentStore(
    (state) => state.document.nodes[state.document.rootId].name,
  )
  return (
    <p className="flex min-w-0 items-center gap-2 text-body">
      <span className="text-faint">/</span>
      <span className="truncate text-muted">{name}</span>
    </p>
  )
}

// Design (the canvas) or Logic (the graph), after the design's name.
function ModeSwitch() {
  const mode = useViewStore((state) => state.mode)
  const setMode = useViewStore((state) => state.setMode)
  return (
    <div className="ml-2">
      <SegmentedControl<EditorMode>
        label="Editor"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'design', label: 'Design' },
          { value: 'logic', label: 'Logic' },
        ]}
      />
    </div>
  )
}

// Select and Hand. (Objects are added from the Insert menu, the command
// field or a right-click.)
function Tools() {
  const tool = useViewStore((state) => state.tool)
  const setTool = useViewStore((state) => state.setTool)
  return (
    <div className="flex gap-0.5">
      <IconButton
        label="Select and move (V)"
        active={tool === 'select'}
        onClick={() => setTool('select')}
      >
        <CursorIcon size={15} />
      </IconButton>
      <IconButton
        label="Pan the view (H, or hold Space)"
        active={tool === 'hand'}
        onClick={() => setTool('hand')}
      >
        <HandIcon size={15} />
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
