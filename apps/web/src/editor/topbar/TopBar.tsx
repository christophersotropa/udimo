import { DEVICES, type DeviceId } from '../../model/screen.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { useViewStore } from '../../store/viewStore.ts'
import { ExportDialog } from '../export/ExportDialog.tsx'
import { CursorIcon, HandIcon } from '../panels/icons.tsx'
import { Button, IconButton } from '../ui/Button.tsx'
import { SegmentedControl } from '../ui/SegmentedControl.tsx'
import { MenuBar } from './MenuBar.tsx'

// The bar across the top, in three parts: logo, design name and menus on
// the left; the tools in the middle; the device and Export on the right.
// The middle column is "auto" between two equal "1fr" columns, which keeps
// the tools centered whatever the sides hold.
export function TopBar() {
  const exportOpen = useViewStore((state) => state.exportOpen)
  const setExportOpen = useViewStore((state) => state.setExportOpen)

  return (
    <header className="grid h-11 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line bg-panel px-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <Breadcrumb />
        <MenuBar />
      </div>

      <Tools />

      <div className="flex items-center justify-end gap-2">
        <DeviceTabs />
        <Button variant="primary" onClick={() => setExportOpen(true)}>
          Export
        </Button>
      </div>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </header>
  )
}

// The logo, then "Udimo / <ScreenGui name>".
function Breadcrumb() {
  const name = useDocumentStore(
    (state) => state.document.nodes[state.document.rootId].name,
  )
  return (
    <p className="flex min-w-0 items-center gap-2 text-[13px]">
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded bg-accent text-sm font-bold text-accent-ink"
      >
        U
      </span>
      <span className="font-semibold text-ink">Udimo</span>
      <span className="text-faint">/</span>
      <span className="truncate text-muted">{name}</span>
    </p>
  )
}

// Select and Hand. (The draw tools are in the Insert menu, and on F, T, B
// and I.)
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
