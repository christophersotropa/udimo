import { useState } from 'react'
import { formatVector2, parseVector2 } from '../../lib/robloxText.ts'
import { isImageClass, isTextClass } from '../../model/classes.ts'
import { resolveProps } from '../../model/defaults.ts'
import {
  closestWeight,
  FONT_IDS,
  FONTS,
  resolveFontFace,
  WEIGHT_LABELS,
} from '../../model/fonts.ts'
import { isLaidOut } from '../../model/layout.ts'
import {
  enumNames,
  type FontWeight,
  TEXT_TRUNCATE,
  TEXT_X_ALIGNMENT,
  TEXT_Y_ALIGNMENT,
} from '../../model/enums.ts'
import type { NodeId, Props } from '../../model/types.ts'
import {
  convertUnits,
  deleteSelection,
  duplicateSelection,
} from '../../store/commands.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { screenOf, useViewStore } from '../../store/viewStore.ts'
import { MenuItem, MenuSeparator, Popover } from '../ui/Popover.tsx'
import { chooseImageFile, previewFromFile } from '../previewImage.ts'
import { IconButton } from '../ui/Button.tsx'
import { ClassIcon } from './ClassIcon.tsx'
import {
  ColorField,
  Hint,
  NumberField,
  Row,
  Section,
  SectionAction,
  SelectField,
  TextField,
  TextValueField,
  ToggleField,
  UDim2Row,
} from './fields.tsx'
import { CloseIcon } from './icons.tsx'
import { ModifiersSection } from './ModifiersSection.tsx'
import { Panel } from './Panel.tsx'
import { PropertyFilter } from './propertyFilter.ts'

// The font dropdown shows names like "Fredoka One", not ids.
const FONT_LABELS = Object.fromEntries(
  FONT_IDS.map((id) => [id, FONTS[id].label]),
)

// "Convert to Scale" / "Convert to Offset" for some elements and
// everything inside them, measured on the device you're viewing, so
// nothing moves there (see model/responsive.ts).
function convert(ids: NodeId[], to: 'scale' | 'offset') {
  convertUnits(useDocumentStore, ids, to, screenOf(useViewStore.getState()))
}

// Shows and edits the selected element's properties, laid out like
// Studio's Properties window.
export function PropertiesPanel() {
  const selection = useDocumentStore((state) => state.selection)
  const selectedId = selection.length === 1 ? selection[0] : null
  // What's typed in "Filter properties". It lives here, above the element,
  // so it stays when you select another one.
  const [query, setQuery] = useState('')

  return (
    <Panel id="properties" title="Properties" padded={false}>
      {selectedId ? (
        <PropertyFilter value={query}>
          {/* key: a different element gets fresh inputs, never leftover
              drafts. */}
          <NodeProperties
            key={selectedId}
            id={selectedId}
            query={query}
            setQuery={setQuery}
          />
        </PropertyFilter>
      ) : selection.length > 1 ? (
        <div className="space-y-2 px-3 py-3">
          <p className="text-[13px] text-ink">{selection.length} selected</p>
          <p className="text-xs text-muted">
            Select one to edit its properties, or convert them all, with
            everything inside:
          </p>
          <div className="flex gap-3">
            <SectionAction onClick={() => convert(selection, 'scale')}>
              Convert to Scale
            </SectionAction>
            <SectionAction onClick={() => convert(selection, 'offset')}>
              Convert to Offset
            </SectionAction>
          </div>
        </div>
      ) : (
        <p className="px-3 py-3 text-xs text-muted">
          Select an element to see its properties. Right-click the canvas or the
          Explorer to add one.
        </p>
      )}
    </Panel>
  )
}

function NodeProperties({
  id,
  query,
  setQuery,
}: {
  id: NodeId
  query: string
  setQuery: (query: string) => void
}) {
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
  // The font as it really draws (a weight it has), and its weight list.
  const face = resolveFontFace(p.FontFace)
  const weights: readonly FontWeight[] = FONTS[face.family].weights
  const hasBold = weights.includes('Bold')

  return (
    // @container: the rows size their label column by this box's width
    // (40cqw, see Row in fields.tsx), so every row, however deeply it's
    // indented, gets the same share of the panel and they all line up.
    <div className="@container">
      {/* The element: icon, name (click to edit), class, and a menu. */}
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <ClassIcon className={node.className} />
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
          className="-mx-1 min-w-0 flex-1 rounded-sm px-1 text-[13px] font-semibold text-ink outline-none hover:bg-raised focus:bg-raised focus:ring-1 focus:ring-accent"
        />
        <span className="shrink-0 text-xs text-muted">{node.className}</span>
        <Popover
          align="right"
          width="w-56"
          trigger={({ open, toggle }) => (
            <button
              type="button"
              aria-label="More"
              aria-expanded={open}
              onClick={toggle}
              className="rounded px-1 text-muted hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              ⋯
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuItem
                onClick={() => {
                  close()
                  convert([id], 'scale')
                }}
                hint="Grows with the screen; nothing moves now"
              >
                Convert to Scale
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close()
                  convert([id], 'offset')
                }}
                hint="Fixed pixels, as on this device"
              >
                Convert to Offset
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                shortcut="⌘D"
                onClick={() => {
                  close()
                  duplicateSelection(useDocumentStore)
                }}
              >
                Duplicate
              </MenuItem>
              <MenuItem
                danger
                shortcut="⌫"
                onClick={() => {
                  close()
                  deleteSelection(useDocumentStore)
                }}
              >
                Delete
              </MenuItem>
            </>
          )}
        </Popover>
      </div>

      <div className="border-b border-line px-3 py-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter properties"
          aria-label="Filter properties"
          className="h-7 w-full rounded bg-app px-2 text-[13px] text-ink ring-1 ring-line outline-none placeholder:text-faint focus:ring-accent"
        />
      </div>

      <Section
        title="Transform"
        action={
          <SectionAction
            onClick={() => convert([id], 'scale')}
            title="Turn pixel sizes and positions into Scale, so this grows with the screen. Includes everything inside; nothing moves on this device."
          >
            Convert to Scale
          </SectionAction>
        }
      >
        {parentLayout && (
          <Hint warn>
            The parent's {parentLayout} places this, so Position
            {parentLayout === 'UIGridLayout' ? ' and Size are' : ' is'} ignored.
          </Hint>
        )}
        <UDim2Row
          label="Position"
          value={p.Position}
          onChange={(Position) => set({ Position })}
        />
        <UDim2Row
          label="Size"
          startOpen
          value={p.Size}
          onChange={(Size) => set({ Size })}
        />
        <Row label="AnchorPoint">
          <TextValueField
            label="AnchorPoint"
            value={p.AnchorPoint}
            format={formatVector2}
            parse={parseVector2}
            onChange={(AnchorPoint) => set({ AnchorPoint })}
          />
        </Row>
        <Row label="Rotation">
          <NumberField
            label="Rotation"
            value={p.Rotation}
            onChange={(Rotation) => set({ Rotation })}
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

      <Section title="Appearance">
        <Row label="BackgroundColor3">
          <ColorField
            label="BackgroundColor3"
            value={p.BackgroundColor3}
            onChange={(BackgroundColor3) => set({ BackgroundColor3 })}
          />
        </Row>
        <Row label="Transparency" name="BackgroundTransparency">
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
        <Row label="BorderSizePixel">
          <NumberField
            label="BorderSizePixel"
            integer
            min={0}
            value={p.BorderSizePixel}
            onChange={(BorderSizePixel) => set({ BorderSizePixel })}
          />
        </Row>
        {/* A border's colour only matters once there is a border. */}
        {p.BorderSizePixel > 0 && (
          <Row label="BorderColor3">
            <ColorField
              label="BorderColor3"
              value={p.BorderColor3}
              onChange={(BorderColor3) => set({ BorderColor3 })}
            />
          </Row>
        )}
        <Row label="ClipsDescendants">
          <ToggleField
            label="ClipsDescendants"
            value={p.ClipsDescendants}
            onChange={(ClipsDescendants) => set({ ClipsDescendants })}
          />
        </Row>
        <Row label="Visible">
          <ToggleField
            label="Visible"
            value={p.Visible}
            onChange={(Visible) => set({ Visible })}
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
          <Row label="Font" name="FontFace">
            <SelectField
              label="Font"
              value={p.FontFace.family}
              options={FONT_IDS}
              labels={FONT_LABELS}
              // Keeps the weight if the new font has it, else the closest.
              onChange={(family) =>
                set({
                  FontFace: {
                    ...p.FontFace,
                    family,
                    weight: closestWeight(family, p.FontFace.weight),
                  },
                })
              }
            />
          </Row>
          <Row label="Weight" name="FontFace">
            {/* Only the weights this font has, named the way Studio names
                them. A font with one weight just says so. */}
            {weights.length === 1 ? (
              <span className="px-1.5 text-xs text-muted">
                {WEIGHT_LABELS[weights[0]]}
              </span>
            ) : (
              <SelectField
                label="Font weight"
                value={face.weight}
                options={weights}
                labels={WEIGHT_LABELS}
                onChange={(weight) =>
                  set({ FontFace: { ...p.FontFace, weight } })
                }
              />
            )}
          </Row>
          <Row label="Style" name="FontFace">
            <div className="flex gap-1">
              {/* Bold: switches between Bold and Regular. */}
              <IconButton
                label="Bold"
                active={face.weight === 'Bold'}
                disabled={!hasBold}
                onClick={() =>
                  set({
                    FontFace: {
                      ...p.FontFace,
                      weight: face.weight === 'Bold' ? 'Regular' : 'Bold',
                    },
                  })
                }
              >
                <span className="font-sans text-[13px] font-bold">B</span>
              </IconButton>
              {/* Italic: switches between Italic and Normal. */}
              <IconButton
                label="Italic"
                active={face.style === 'Italic'}
                onClick={() =>
                  set({
                    FontFace: {
                      ...p.FontFace,
                      style: face.style === 'Italic' ? 'Normal' : 'Italic',
                    },
                  })
                }
              >
                <span className="font-serif text-[13px] italic">I</span>
              </IconButton>
            </div>
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
            <ToggleField
              label="TextScaled"
              value={p.TextScaled}
              onChange={(TextScaled) => set({ TextScaled })}
            />
          </Row>
          {p.TextScaled && (
            <Hint>
              TextScaled is on, so the text fills its box and TextSize is
              ignored.
            </Hint>
          )}
          <Row label="TextWrapped">
            <ToggleField
              label="TextWrapped"
              value={p.TextWrapped}
              onChange={(TextWrapped) => set({ TextWrapped })}
            />
          </Row>
          <Row label="TextXAlignment">
            <SelectField
              label="TextXAlignment"
              value={p.TextXAlignment}
              options={enumNames(TEXT_X_ALIGNMENT)}
              onChange={(TextXAlignment) => set({ TextXAlignment })}
            />
          </Row>
          <Row label="TextYAlignment">
            <SelectField
              label="TextYAlignment"
              value={p.TextYAlignment}
              options={enumNames(TEXT_Y_ALIGNMENT)}
              onChange={(TextYAlignment) => set({ TextYAlignment })}
            />
          </Row>
          <Row label="TextTransparency">
            <NumberField
              label="TextTransparency"
              min={0}
              max={1}
              value={p.TextTransparency}
              onChange={(TextTransparency) => set({ TextTransparency })}
            />
          </Row>
          <Row label="LineHeight">
            {/* Roblox keeps it between 1 and 3 */}
            <NumberField
              label="LineHeight"
              min={1}
              max={3}
              value={p.LineHeight}
              onChange={(LineHeight) => set({ LineHeight })}
            />
          </Row>
          <Row label="TextTruncate">
            <SelectField
              label="TextTruncate"
              value={p.TextTruncate}
              options={enumNames(TEXT_TRUNCATE)}
              onChange={(TextTruncate) => set({ TextTruncate })}
            />
          </Row>
          <Row label="RichText">
            <ToggleField
              label="RichText"
              value={p.RichText}
              onChange={(RichText) => set({ RichText })}
            />
          </Row>
          {p.RichText && (
            <Hint>
              Style parts of the text with tags: &lt;b&gt;, &lt;i&gt;,
              &lt;u&gt;, &lt;s&gt;, &lt;br/&gt;, &lt;font color="#FFD700"
              size="30"&gt;, &lt;mark&gt;, &lt;uc&gt;.
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
        <Section title="TextBox">
          <Row label="PlaceholderText">
            <TextField
              label="PlaceholderText"
              value={p.PlaceholderText}
              onChange={(PlaceholderText) => set({ PlaceholderText })}
            />
          </Row>
          <Row label="PlaceholderColor3">
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
            Paste the image’s Roblox asset ID or link: that’s what exports.
          </Hint>
          <PreviewRow id={id} previewKey={node.previewImage} />
        </Section>
      )}

      {node.className === 'ScrollingFrame' && (
        <Section title="Scrolling">
          <UDim2Row
            label="CanvasSize"
            value={p.CanvasSize}
            onChange={(CanvasSize) => set({ CanvasSize })}
          />
          <Row label="ScrollBarThickness">
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

// A picture from your computer to see on the canvas while the real one
// isn't on Roblox yet (UiNode.previewImage). Preview only: never exported.
function PreviewRow({
  id,
  previewKey,
}: {
  id: NodeId
  previewKey: string | undefined
}) {
  const preview = useDocumentStore((state) =>
    previewKey ? state.document.images?.[previewKey] : undefined,
  )
  const setPreviewImage = useDocumentStore((state) => state.setPreviewImage)
  // Why the last file couldn't be used, if it couldn't.
  const [error, setError] = useState<string | null>(null)
  const choose = () =>
    chooseImageFile(async (file) => setError(await previewFromFile(id, file)))

  return (
    <>
      <Row label="Preview">
        {preview ? (
          <>
            <img
              src={preview.dataUrl}
              alt=""
              className="size-6 shrink-0 rounded-sm bg-app object-contain ring-1 ring-line"
            />
            <button
              type="button"
              onClick={choose}
              title={`${preview.name} (${preview.width} × ${preview.height}) · click to change`}
              className="min-w-0 flex-1 truncate text-left text-xs text-ink hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
            >
              {preview.name}
            </button>
            <IconButton
              label="Remove the preview"
              onClick={() => setPreviewImage(id, null)}
              className="size-6"
            >
              <CloseIcon size={12} />
            </IconButton>
          </>
        ) : (
          <button
            type="button"
            onClick={choose}
            className="h-6 rounded-sm bg-app px-2 text-xs text-ink ring-1 ring-line hover:ring-hover focus-visible:outline-2 focus-visible:outline-accent"
          >
            Choose image…
          </button>
        )}
      </Row>
      {error ? (
        <Hint warn>{error}</Hint>
      ) : (
        <Hint>
          {preview
            ? 'Preview only, not exported. Upload this file to Roblox and paste its ID above.'
            : 'Pick the file from your computer to see it on the canvas (or drop it on the element).'}
        </Hint>
      )}
    </>
  )
}
