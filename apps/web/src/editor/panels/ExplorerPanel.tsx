import { Panel } from './Panel.tsx'

// Will show the instance tree (ScreenGui > Frame > TextLabel ...).
export function ExplorerPanel() {
  return (
    <Panel title="Explorer" side="left">
      <p className="text-sm text-zinc-500">No elements yet.</p>
    </Panel>
  )
}
