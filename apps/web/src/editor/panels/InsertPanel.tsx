import { planInsert } from '../../model/insert.ts'
import type { ElementClassName } from '../../store/documentStore.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { Panel } from './Panel.tsx'

// The classes you can insert so far. More arrive in builds 22 and 23.
const INSERTABLE: { className: ElementClassName; hint: string }[] = [
  { className: 'Frame', hint: 'A box. Holds other elements.' },
  { className: 'TextLabel', hint: 'A box with text.' },
]

// Adds an element, then selects it so you can drag or edit it straight away.
// Reads the store at click time (getState), so the palette doesn't re-render
// on every edit.
function insert(className: ElementClassName) {
  const { document, selection, addNode, select } = useDocumentStore.getState()
  const { parentId, props } = planInsert(document, selection, className)
  const id = addNode(parentId, className, props)
  select(id)
}

export function InsertPanel() {
  return (
    <Panel title="Insert" side="left">
      <div className="grid grid-cols-2 gap-1.5">
        {INSERTABLE.map(({ className, hint }) => (
          <button
            key={className}
            type="button"
            title={hint}
            onClick={() => insert(className)}
            className="rounded bg-zinc-800 px-2 py-1.5 text-left text-xs text-zinc-200 ring-1 ring-zinc-700 hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            {className}
          </button>
        ))}
      </div>
    </Panel>
  )
}
