import { Canvas } from '../editor/canvas/Canvas.tsx'
import { ContextMenu } from '../editor/menus/ContextMenu.tsx'
import { ExplorerPanel } from '../editor/panels/ExplorerPanel.tsx'
import { PropertiesPanel } from '../editor/panels/PropertiesPanel.tsx'
import { StatusBar } from '../editor/StatusBar.tsx'
import { TopBar } from '../editor/topbar/TopBar.tsx'
import { useKeyboardShortcuts } from './useKeyboardShortcuts.ts'

// The editor fills the window exactly (h-svh), so the page itself never scrolls.
// Rows: top bar, the workspace, the status bar.
// Columns: Explorer | Canvas | Properties.
// Objects are inserted by right-clicking (or the Explorer's + buttons).
function App() {
  useKeyboardShortcuts()

  return (
    <div className="grid h-svh grid-rows-[auto_1fr_auto] overflow-hidden bg-app text-ink">
      <TopBar />
      <div className="grid min-h-0 grid-cols-[240px_1fr_280px]">
        <ExplorerPanel />
        <Canvas />
        <PropertiesPanel />
      </div>
      <StatusBar />
      {/* The right-click menu, drawn above everything when it's open. */}
      <ContextMenu />
    </div>
  )
}

export default App
