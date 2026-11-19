import { Canvas } from '../editor/canvas/Canvas.tsx'
import { ContextMenu } from '../editor/menus/ContextMenu.tsx'
import { ExplorerPanel } from '../editor/panels/ExplorerPanel.tsx'
import { PropertiesPanel } from '../editor/panels/PropertiesPanel.tsx'
import { StatusBar } from '../editor/StatusBar.tsx'
import { TopBar } from '../editor/topbar/TopBar.tsx'
import { PanelDropPreview } from '../editor/panels/PanelDropPreview.tsx'
import { PanelResizer } from '../editor/panels/PanelResizer.tsx'
import { canvasColumn, gridColumns, gridRows } from '../store/panelLayout.ts'
import { useViewStore } from '../store/viewStore.ts'
import { useKeyboardShortcuts } from './useKeyboardShortcuts.ts'

// The editor fills the window exactly (h-svh), so the page itself never
// scrolls. overflow-clip (not hidden) means it can't be scrolled at all,
// not even by the browser following a text selection off the edge.
// Rows: top bar, the workspace, the status bar.
// The panels dock on either side of the canvas, or both on one side,
// stacked (store/panelLayout.ts). Explorer starts left, Properties right.
// Objects are inserted by right-clicking (or the Explorer's + buttons).
function App() {
  useKeyboardShortcuts()
  const panels = useViewStore((state) => state.panels)

  return (
    <div className="grid h-svh grid-rows-[auto_1fr_auto] overflow-clip bg-app text-ink">
      <TopBar />
      {/* The workspace: a grid of [left side] canvas [right side], with two
          rows so panels docked on one side can stack (panelLayout.ts).
          Each panel places itself in it, so they're always the same three
          children here and moving a panel never rebuilds it: the Explorer
          keeps its open folders and filter. The id lets a panel drag
          measure the workspace. */}
      <div
        id="workspace"
        className="relative grid min-h-0"
        style={{
          gridTemplateColumns: gridColumns(panels),
          gridTemplateRows: gridRows(panels),
        }}
      >
        <ExplorerPanel />
        <div
          className="grid min-h-0 min-w-0"
          style={{ gridColumn: canvasColumn(panels), gridRow: '1 / 3' }}
        >
          <Canvas />
        </div>
        <PropertiesPanel />
        {/* Each side's resize edge, the full height of the workspace. */}
        {panels.left.length > 0 && <PanelResizer side="left" />}
        {panels.right.length > 0 && <PanelResizer side="right" />}
        <PanelDropPreview />
      </div>
      <StatusBar />
      {/* The right-click menu, drawn above everything when it's open. */}
      <ContextMenu />
    </div>
  )
}

export default App
