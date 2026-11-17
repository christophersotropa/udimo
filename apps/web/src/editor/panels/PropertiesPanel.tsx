import { Panel } from './Panel.tsx'

// Will show Size, Position, colors, text, etc. for the selected element.
export function PropertiesPanel() {
  return (
    <Panel title="Properties" side="right">
      <p className="text-sm text-zinc-500">
        Select an element to edit its properties.
      </p>
    </Panel>
  )
}
