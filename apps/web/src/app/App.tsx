import { Canvas } from '../editor/canvas/Canvas.tsx'
import { ExplorerPanel } from '../editor/panels/ExplorerPanel.tsx'
import { PropertiesPanel } from '../editor/panels/PropertiesPanel.tsx'
import { Toolbar } from '../editor/panels/Toolbar.tsx'
import { useUndoShortcuts } from './useUndoShortcuts.ts'

// The editor fills the window exactly (h-svh), so the page itself never scrolls.
// Rows: toolbar, then the workspace. Columns: Explorer | Canvas | Properties.
function App() {
  useUndoShortcuts()

  return (
    <div className="grid h-svh grid-rows-[auto_1fr] bg-zinc-950 text-zinc-100">
      <Toolbar />
      <div className="grid min-h-0 grid-cols-[240px_1fr_280px]">
        <ExplorerPanel />
        <Canvas />
        <PropertiesPanel />
      </div>
    </div>
  )
}

export default App
