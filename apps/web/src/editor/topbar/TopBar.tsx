import { DEVICES, type DeviceId } from '../../model/screen.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { useViewStore } from '../../store/viewStore.ts'
import { ExportDialog } from '../export/ExportDialog.tsx'
import { CursorIcon, HandIcon } from '../panels/icons.tsx'
import { Button, IconButton } from '../ui/Button.tsx'
import { SegmentedControl } from '../ui/SegmentedControl.tsx'
import { AppMenu } from './AppMenu.tsx'
import { CommandBar } from './CommandBar.tsx'

// The bar across the top, in three parts: the Udimo menu (File, Edit,
// View, Insert, Arrange) and the design's name on the left; the command
// field in the middle; the tools, device and Export on the right.
// The middle column is "auto" between two equal "1fr" columns, which keeps
// the command field centered whatever the sides hold.
export function TopBar() {
  const exportOpen = useViewStore((state) => state.exportOpen)
  const setExportOpen = useViewStore((state) => state.setExportOpen)

  return (
    <header className="grid h-11 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line bg-panel px-2.5">
      <div className="flex min-w-0 items-center gap-1">
        <AppMenu />
        <DesignName />
      </div>

      <CommandBar />

      <div className="flex items-center justify-end gap-2">
        <Tools />
        <DeviceTabs />
        <Button variant="primary" onClick={() => setExportOpen(true)}>
          Export
        </Button>
      </div>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
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
