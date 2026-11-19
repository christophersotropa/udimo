import { isImageClass, isTextClass } from '../../model/classes.ts'
import { resolveProps } from '../../model/defaults.ts'
import { enumNames, FONT_WEIGHT } from '../../model/enums.ts'
import { FONT_IDS, FONTS } from '../../model/fonts.ts'
import { isLaidOut } from '../../model/layout.ts'
import type { NodeId, Props } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import {
  ColorField,
  ColumnHeads,
  Hint,
  NumberField,
  Row,
  Section,
  SelectField,
  TextField,
  ToggleField,
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
  const selectedId = selection.length === 1 ? selection[0] : null

  return (
    // No title bar: the selected element's name heads the panel instead.
    <Panel title="Properties" side="right" padded={false} showTitle={false}>
      {selectedId ? (
        // key: a different element gets fresh inputs, never leftover drafts.
        <NodeProperties key={selectedId} id={selectedId} />
      ) : selection.length > 1 ? (
        <div className="space-y-3 px-3.5 py-4">
          <p className="font-semibold">{selection.length} elements</p>
          <p className="text-sm text-muted">
            Select one to edit its properties, or convert them all at once:
          </p>
          <ResponsiveButtons ids={selection} />
        </div>
      ) : (
        <p className="px-3.5 py-4 text-sm text-muted">
          Select an element to see its properties. Right-click the canvas or the
          Explorer to add one.
        </p>
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
  const parentName = useDocumentStore((state) => {
    const parentId = state.document.nodes[id]?.parentId
    return parentId ? state.document.nodes[parentId].name : ''
  })
  if (!node) return null

  // Unset properties show their Roblox defaults. Editing one saves it.
  const p = resolveProps(node)
  const set = (props: Props) => updateProps(id, props)

  return (
    <div>
      {/* The name (click to edit) and what it is. */}
      <div className="border-b border-line px-3.5 pt-3.5 pb-3">
        <input
          aria-label="Name"
          value={node.name}
          onChange={(event) => renameNode(id, event.target.value)}
          // One visit to the box is one undo step. Leaving it empty would
          // leave the element nameless, so it falls back to its class name.
          onFocus={() => useDocumentStore.getState().beginGroup()}
          onBlur={(event) => {
            if (event.target.value.trim() === '') {
              renameNode(id, node.className)
            }
            useDocumentStore.getState().endGroup()
          }}
          className="-mx-1 w-full rounded px-1 text-base font-semibold text-ink outline-none hover:bg-raised focus:bg-raised focus:ring-1 focus:ring-accent"
        />
        <p className="text-sm text-muted">
          {node.className} · inside {parentName}
        </p>
      </div>

      <Section title="Layout">
        {parentLayout && (
          <Hint warn>
            The parent's {parentLayout} places this element, so Position
            {parentLayout === 'UIGridLayout' ? ' and Size are' : ' is'} ignored.
            Reorder it in the Explorer or with LayoutOrder.
          </Hint>
        )}
        <ColumnHeads left="Scale" right="Offset px" />
        <UDim2Rows
          name="Position"
          short="Pos"
          value={p.Position}
          onChange={(Position) => set({ Position })}
        />
        <UDim2Rows
          name="Size"
          value={p.Size}
          onChange={(Size) => set({ Size })}
        />
        <Row label="Anchor">
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
          <ToggleField
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
            <ToggleField
              label="TextScaled"
              value={p.TextScaled}
              onChange={(TextScaled) => set({ TextScaled })}
            />
          </Row>
          {p.TextScaled && (
            <Hint>
              TextScaled is on: the text grows or shrinks to fill its box (up to
              100), so TextSize is ignored.
            </Hint>
          )}
        </Section>
      )}

      {(node.className === 'TextButton' ||
        node.className === 'ImageButton') && (
        <Section title="Button">
          <Row label="AutoButtonColor">
            {/* Only visible in game: the canvas doesn't react to hovering. */}
            <ToggleField
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
            <ToggleField
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
          <Hint>
            Paste an image ID or its Roblox link. Upload the image to Roblox
            first; the canvas shows a placeholder.
          </Hint>
        </Section>
      )}

      {node.className === 'ScrollingFrame' && (
        <Section title="Scrolling">
          <ColumnHeads left="Scale" right="Offset px" />
          <UDim2Rows
            name="CanvasSize"
            short="Canvas"
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
