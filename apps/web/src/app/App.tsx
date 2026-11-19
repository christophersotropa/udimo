import { Canvas } from '../editor/canvas/Canvas.tsx'
import { ExplorerPanel } from '../editor/panels/ExplorerPanel.tsx'
import { InsertPanel } from '../editor/panels/InsertPanel.tsx'
import { PropertiesPanel } from '../editor/panels/PropertiesPanel.tsx'
import { TopBar } from '../editor/topbar/TopBar.tsx'
import { useKeyboardShortcuts } from './useKeyboardShortcuts.ts'

// The editor fills the window exactly (h-svh), so the page itself never scrolls.
// Rows: top bar, then the workspace. Columns: Insert + Explorer | Canvas | Properties.
// (The Insert panel goes away when right-click insert arrives, build 35.)
function App() {
  useKeyboardShortcuts()

  return (
    <div className="grid h-svh grid-rows-[auto_1fr] bg-app text-ink">
      <TopBar />
      <div className="grid min-h-0 grid-cols-[248px_1fr_288px]">
        {/* Left column: the palette takes the height it needs, Explorer the rest. */}
        <div className="grid min-h-0 grid-rows-[auto_1fr]">
          <div className="border-b border-line">
            <InsertPanel />
          </div>
          <ExplorerPanel />
        </div>
        <Canvas />
        <PropertiesPanel />
      </div>
    </div>
  )
}

export default App
