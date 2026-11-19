import { isImageClass, isTextClass } from '../../model/classes.ts'
import { resolveProps } from '../../model/defaults.ts'
import { enumNames, FONT_WEIGHT } from '../../model/enums.ts'
import { FONT_IDS, FONTS } from '../../model/fonts.ts'
import { isLaidOut } from '../../model/layout.ts'
import type { NodeId, Props } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import {
  CheckboxField,
  ColorField,
  NumberField,
  Row,
  Section,
  SelectField,
  TextField,
  UDim2Rows,
} from './fields.tsx'
import { ModifiersSection } from './ModifiersSection.tsx'
import { Panel } from './Panel.tsx'
import { ResponsiveButtons } from './ResponsiveButtons.tsx'

// The font dropdown shows names like "Fredoka One", not ids.
const FONT_LABELS = Object.fromEntries(
  FONT_IDS.map((id) => [id, FONTS[id].label]),
)

// Shows and edits the properties of the selected element.
export function PropertiesPanel() {
  const selection = useDocumentStore((state) => state.selection)
  const selectionCount = selection.length
  const selectedId = useDocumentStore((state) =>
    state.selection.length === 1 ? state.selection[0] : null,
  )

  return (
    <Panel title="Properties" side="right">
      {selectedId ? (
        // key: a different element gets fresh inputs, never leftover drafts.
        <NodeProperties key={selectedId} id={selectedId} />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            {selectionCount > 1
              ? `${selectionCount} elements selected. Select one to edit its properties.`
              : 'Select an element to edit its properties.'}
          </p>
          {selectionCount > 1 && <ResponsiveButtons ids={selection} />}
        </div>
      )}
    </Panel>
  )
}

function NodeProperties({ id }: { id: NodeId }) {
  const node = useDocumentStore((state) => state.document.nodes[id])
  const renameNode = useDocumentStore((state) => state.renameNode)
  const updateProps = useDocumentStore((state) => state.updateProps)
  // Which layout the parent uses, if this element is placed by one.
  const parentLayout = useDocumentStore((state) => {
    if (!isLaidOut(state.document, id)) return null
    const parent = state.document.nodes[state.document.nodes[id].parentId!]
    return parent.modifiers?.UIListLayout ? 'UIListLayout' : 'UIGridLayout'
  })
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
        {parentLayout && (
          <p className="text-[11px] text-amber-300/80">
            The parent's {parentLayout} places this element, so Position
            {parentLayout === 'UIGridLayout' ? ' and Size are' : ' is'} ignored.
            Reorder it in the Explorer or with LayoutOrder.
          </p>
        )}
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
        <ResponsiveButtons ids={[id]} />
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

      <ModifiersSection id={id} />

      {isTextClass(node.className) && (
        <Section title="Text">
          <Row label="Text">
            <TextField
              label="Text"
              value={p.Text}
              onChange={(Text) => set({ Text })}
            />
          </Row>
          <Row label="Font">
            <SelectField
              label="Font"
              value={p.FontFace.family}
              options={FONT_IDS}
              labels={FONT_LABELS}
              // A font without Bold falls back to Regular.
              onChange={(family) =>
                set({
                  FontFace: {
                    family,
                    weight: FONTS[family].bold ? p.FontFace.weight : 'Regular',
                  },
                })
              }
            />
          </Row>
          {FONTS[p.FontFace.family].bold && (
            <Row label="Weight">
              <SelectField
                label="Font weight"
                value={p.FontFace.weight}
                options={enumNames(FONT_WEIGHT)}
                onChange={(weight) =>
                  set({ FontFace: { ...p.FontFace, weight } })
                }
              />
            </Row>
          )}
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
          {p.TextScaled && (
            <p className="text-[11px] text-zinc-500">
              TextScaled is on: the text grows or shrinks to fill its box (up to
              100), so TextSize is ignored.
            </p>
          )}
        </Section>
      )}

      {(node.className === 'TextButton' ||
        node.className === 'ImageButton') && (
        <Section title="Button">
          <Row label="AutoButtonColor">
            {/* Only visible in game: the canvas doesn't react to hovering. */}
            <CheckboxField
              label="AutoButtonColor"
              value={p.AutoButtonColor}
              onChange={(AutoButtonColor) => set({ AutoButtonColor })}
            />
          </Row>
        </Section>
      )}

      {node.className === 'TextBox' && (
        <Section title="Text box">
          <Row label="Placeholder">
            <TextField
              label="PlaceholderText"
              value={p.PlaceholderText}
              onChange={(PlaceholderText) => set({ PlaceholderText })}
            />
          </Row>
          <Row label="Placeholder color">
            <ColorField
              label="PlaceholderColor3"
              value={p.PlaceholderColor3}
              onChange={(PlaceholderColor3) => set({ PlaceholderColor3 })}
            />
          </Row>
          <Row label="ClearTextOnFocus">
            <CheckboxField
              label="ClearTextOnFocus"
              value={p.ClearTextOnFocus}
              onChange={(ClearTextOnFocus) => set({ ClearTextOnFocus })}
            />
          </Row>
        </Section>
      )}

      {isImageClass(node.className) && (
        <Section title="Image">
          <Row label="Image">
            <TextField
              label="Image asset ID"
              value={p.Image}
              onChange={(Image) => set({ Image })}
            />
          </Row>
          <p className="text-[11px] text-zinc-500">
            Paste an image ID or its Roblox link. Upload the image to Roblox
            first; the canvas shows a placeholder.
          </p>
        </Section>
      )}

      {node.className === 'ScrollingFrame' && (
        <Section title="Scrolling">
          <UDim2Rows
            name="CanvasSize"
            value={p.CanvasSize}
            onChange={(CanvasSize) => set({ CanvasSize })}
          />
          <Row label="Scroll bar">
            <NumberField
              label="ScrollBarThickness"
              integer
              min={0}
              value={p.ScrollBarThickness}
              onChange={(ScrollBarThickness) => set({ ScrollBarThickness })}
            />
          </Row>
        </Section>
      )}
    </div>
  )
}
