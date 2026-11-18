import { resolveProps } from '../../model/defaults.ts'
import type { ClassName, NodeId, Props, UDim2 } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import {
  CheckboxField,
  ColorField,
  NumberField,
  Row,
  Section,
  TextField,
} from './fields.tsx'
import { Panel } from './Panel.tsx'

const TEXT_CLASSES: ClassName[] = ['TextLabel', 'TextButton', 'TextBox']
const IMAGE_CLASSES: ClassName[] = ['ImageLabel', 'ImageButton']

// Shows and edits the properties of the selected element.
export function PropertiesPanel() {
  const selectionCount = useDocumentStore((state) => state.selection.length)
  const selectedId = useDocumentStore((state) =>
    state.selection.length === 1 ? state.selection[0] : null,
  )

  return (
    <Panel title="Properties" side="right">
      {selectedId ? (
        // key: a different element gets fresh inputs, never leftover drafts.
        <NodeProperties key={selectedId} id={selectedId} />
      ) : (
        <p className="text-sm text-zinc-500">
          {selectionCount > 1
            ? `${selectionCount} elements selected. Select one to edit its properties.`
            : 'Select an element to edit its properties.'}
        </p>
      )}
    </Panel>
  )
}

// Position and Size: Scale and Offset for X, then for Y, like Studio shows them.
function UDim2Rows({
  name,
  value,
  onChange,
}: {
  name: string
  value: UDim2
  onChange: (value: UDim2) => void
}) {
  return (
    <>
      <Row label={`${name} X`}>
        <NumberField
          label={`${name} X Scale`}
          value={value.xs}
          onChange={(xs) => onChange({ ...value, xs })}
        />
        <NumberField
          label={`${name} X Offset`}
          integer
          value={value.xo}
          onChange={(xo) => onChange({ ...value, xo })}
        />
      </Row>
      <Row label={`${name} Y`}>
        <NumberField
          label={`${name} Y Scale`}
          value={value.ys}
          onChange={(ys) => onChange({ ...value, ys })}
        />
        <NumberField
          label={`${name} Y Offset`}
          integer
          value={value.yo}
          onChange={(yo) => onChange({ ...value, yo })}
        />
      </Row>
    </>
  )
}

function NodeProperties({ id }: { id: NodeId }) {
  const node = useDocumentStore((state) => state.document.nodes[id])
  const renameNode = useDocumentStore((state) => state.renameNode)
  const updateProps = useDocumentStore((state) => state.updateProps)
  if (!node) return null

  // Unset properties show their Roblox defaults. Editing one saves it.
  const p = resolveProps(node)
  const set = (props: Props) => updateProps(id, props)

  return (
    <div className="space-y-3">
      <Section title="Element">
        <Row label="Name">
          <TextField
            label="Name"
            value={node.name}
            onChange={(name) => renameNode(id, name)}
          />
        </Row>
        <Row label="Class">
          <span className="text-xs text-zinc-300">{node.className}</span>
        </Row>
      </Section>

      <Section title="Layout">
        <p className="grid grid-cols-[96px_1fr_1fr] gap-1 text-[10px] text-zinc-500">
          <span />
          <span>Scale</span>
          <span>Offset (px)</span>
        </p>
        <UDim2Rows
          name="Position"
          value={p.Position}
          onChange={(Position) => set({ Position })}
        />
        <UDim2Rows
          name="Size"
          value={p.Size}
          onChange={(Size) => set({ Size })}
        />
        <Row label="AnchorPoint">
          <NumberField
            label="AnchorPoint X"
            value={p.AnchorPoint.x}
            onChange={(x) => set({ AnchorPoint: { ...p.AnchorPoint, x } })}
          />
          <NumberField
            label="AnchorPoint Y"
            value={p.AnchorPoint.y}
            onChange={(y) => set({ AnchorPoint: { ...p.AnchorPoint, y } })}
          />
        </Row>
      </Section>

      <Section title="Appearance">
        <Row label="Background">
          <ColorField
            label="BackgroundColor3"
            value={p.BackgroundColor3}
            onChange={(BackgroundColor3) => set({ BackgroundColor3 })}
          />
        </Row>
        <Row label="Transparency">
          <NumberField
            label="BackgroundTransparency"
            min={0}
            max={1}
            value={p.BackgroundTransparency}
            onChange={(BackgroundTransparency) =>
              set({ BackgroundTransparency })
            }
          />
        </Row>
        <Row label="Visible">
          <CheckboxField
            label="Visible"
            value={p.Visible}
            onChange={(Visible) => set({ Visible })}
          />
        </Row>
        <Row label="ZIndex">
          <NumberField
            label="ZIndex"
            integer
            value={p.ZIndex}
            onChange={(ZIndex) => set({ ZIndex })}
          />
        </Row>
        <Row label="LayoutOrder">
          <NumberField
            label="LayoutOrder"
            integer
            value={p.LayoutOrder}
            onChange={(LayoutOrder) => set({ LayoutOrder })}
          />
        </Row>
      </Section>

      {TEXT_CLASSES.includes(node.className) && (
        <Section title="Text">
          <Row label="Text">
            <TextField
              label="Text"
              value={p.Text}
              onChange={(Text) => set({ Text })}
            />
          </Row>
          <Row label="TextColor3">
            <ColorField
              label="TextColor3"
              value={p.TextColor3}
              onChange={(TextColor3) => set({ TextColor3 })}
            />
          </Row>
          <Row label="TextSize">
            {/* Roblox caps TextSize at 100 */}
            <NumberField
              label="TextSize"
              integer
              min={1}
              max={100}
              value={p.TextSize}
              onChange={(TextSize) => set({ TextSize })}
            />
          </Row>
          <Row label="TextScaled">
            <CheckboxField
              label="TextScaled"
              value={p.TextScaled}
              onChange={(TextScaled) => set({ TextScaled })}
            />
          </Row>
        </Section>
      )}

      {IMAGE_CLASSES.includes(node.className) && (
        <Section title="Image">
          <Row label="Image">
            <TextField
              label="Image asset ID"
              value={p.Image}
              onChange={(Image) => set({ Image })}
            />
          </Row>
        </Section>
      )}
    </div>
  )
}
