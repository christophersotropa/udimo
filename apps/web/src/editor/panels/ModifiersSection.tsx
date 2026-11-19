import { useState } from 'react'
import { withEnd } from '../../lib/sequence.ts'
import { formatUDim } from '../../lib/robloxText.ts'
import { isTextClass } from '../../model/classes.ts'
import {
  APPLY_STROKE_MODE,
  enumNames,
  FILL_DIRECTION,
  HORIZONTAL_ALIGNMENT,
  type HorizontalAlignment,
  SORT_ORDER,
  VERTICAL_ALIGNMENT,
  type VerticalAlignment,
} from '../../model/enums.ts'
import {
  MODIFIER_CLASSES,
  modifierSummary,
  resolveModifier,
} from '../../model/modifiers.ts'
import type { ModifierClass, NodeId, UiNode } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { MenuItem, Popover } from '../ui/Popover.tsx'
import {
  ColorField,
  NumberField,
  Row,
  Section,
  SelectField,
  UDim2Row,
  UDimRow,
} from './fields.tsx'
import { ChevronIcon, CloseIcon } from './icons.tsx'

// A modifier's value in a few characters, the way Studio would show its
// main property: UICorner "{0, 14}", UIPadding "12, 12, 12, 12". Others
// use their summary ("Vertical, 8 px gap").
function shortValue(node: UiNode, modifier: ModifierClass): string {
  const corner = modifier === 'UICorner' && resolveModifier(node, 'UICorner')
  if (corner) return formatUDim(corner.CornerRadius)

  const padding = modifier === 'UIPadding' && resolveModifier(node, 'UIPadding')
  if (padding) {
    // Top, right, bottom, left, like CSS. Plain pixels when there's no Scale.
    const sides = [
      padding.PaddingTop,
      padding.PaddingRight,
      padding.PaddingBottom,
      padding.PaddingLeft,
    ]
    return sides.every((side) => side.s === 0)
      ? sides.map((side) => side.o).join(', ')
      : sides.map(formatUDim).join(' ')
  }
  return modifierSummary(modifier, resolveModifier(node, modifier)!)
}

// The Modifiers section: a row per modifier the element has, with its
// value. Click a row to open its fields; hover for × to remove it. "Add"
// (on the title) adds one of the others.
export function ModifiersSection({ id }: { id: NodeId }) {
  const node = useDocumentStore((state) => state.document.nodes[id])
  const { addModifier, removeModifier } = useDocumentStore.getState()
  // Which rows are open. Only this panel cares, so it's React state.
  const [open, setOpen] = useState<ReadonlySet<ModifierClass>>(new Set())
  if (!node) return null

  const on = MODIFIER_CLASSES.filter((m) => node.modifiers?.[m])
  const addable = MODIFIER_CLASSES.filter((m) => !on.includes(m))
  const toggle = (m: ModifierClass, isOpen: boolean) =>
    setOpen((previous) => {
      const next = new Set(previous)
      if (isOpen) next.add(m)
      else next.delete(m)
      return next
    })

  return (
    <Section
      title="Modifiers"
      action={
        addable.length > 0 && (
          <Popover
            align="right"
            width="w-56"
            trigger={({ open: menuOpen, toggle: toggleMenu }) => (
              <button
                type="button"
                onClick={toggleMenu}
                aria-expanded={menuOpen}
                className="text-xs text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
              >
                Add
              </button>
            )}
          >
            {(close) =>
              addable.map((m) => (
                <MenuItem
                  key={m}
                  onClick={() => {
                    close()
                    addModifier(id, m)
                    toggle(m, true) // open it, ready to adjust
                  }}
                >
                  {m}
                </MenuItem>
              ))
            }
          </Popover>
        )
      }
    >
      {on.length === 0 && (
        <p className="py-0.5 text-xs text-faint">
          None yet. Add rounded corners, an outline, a layout...
        </p>
      )}
      {on.map((m) => {
        const isOpen = open.has(m)
        return (
          <div key={m}>
            <div className="group grid min-h-6 grid-cols-[100px_1fr_auto] items-center gap-2">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggle(m, !isOpen)}
                className="flex items-center gap-0.5 truncate text-left text-xs text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                <ChevronIcon
                  className={`-ml-0.5 shrink-0 text-faint transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
                {m}
              </button>
              <button
                type="button"
                onClick={() => toggle(m, !isOpen)}
                className="h-6 min-w-0 truncate rounded-sm bg-app px-1.5 text-left font-mono text-xs text-ink ring-1 ring-line hover:ring-hover"
              >
                {shortValue(node, m)}
              </button>
              <button
                type="button"
                aria-label={`Remove ${m}`}
                title={`Remove ${m}`}
                onClick={() => removeModifier(id, m)}
                className="rounded p-0.5 text-faint opacity-0 group-hover:opacity-100 hover:text-danger focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <CloseIcon size={12} />
              </button>
            </div>
            {isOpen && (
              <div className="my-1 space-y-1 border-l border-line pl-2">
                <ModifierFields id={id} modifier={m} />
              </div>
            )}
          </div>
        )
      })}
    </Section>
  )
}

// One modifier's fields, shown when its row is opened. Rows only exist for
// modifiers that are on, which is why each resolveModifier(...)! is safe.
function ModifierFields({
  id,
  modifier,
}: {
  id: NodeId
  modifier: ModifierClass
}) {
  const node = useDocumentStore((state) => state.document.nodes[id])
  const update = useDocumentStore((state) => state.updateModifier)
  if (!node) return null

  switch (modifier) {
    case 'UICorner': {
      const corner = resolveModifier(node, 'UICorner')!
      return (
        <UDimRow
          label="Corner radius"
          value={corner.CornerRadius}
          onChange={(CornerRadius) => update(id, 'UICorner', { CornerRadius })}
        />
      )
    }
    case 'UIStroke': {
      const stroke = resolveModifier(node, 'UIStroke')!
      return (
        <>
          <Row label="Stroke color">
            <ColorField
              label="UIStroke Color"
              value={stroke.Color}
              onChange={(Color) => update(id, 'UIStroke', { Color })}
            />
          </Row>
          <Row label="Thickness">
            <NumberField
              label="UIStroke Thickness"
              min={0}
              value={stroke.Thickness}
              onChange={(Thickness) => update(id, 'UIStroke', { Thickness })}
            />
          </Row>
          {/* Only text elements have a choice; others always get a border. */}
          {isTextClass(node.className) && (
            <Row label="Apply to">
              <SelectField
                label="UIStroke ApplyStrokeMode"
                value={stroke.ApplyStrokeMode}
                options={enumNames(APPLY_STROKE_MODE)}
                onChange={(ApplyStrokeMode) =>
                  update(id, 'UIStroke', { ApplyStrokeMode })
                }
              />
            </Row>
          )}
          <Row label="Transparency">
            <NumberField
              label="UIStroke Transparency"
              min={0}
              max={1}
              value={stroke.Transparency}
              onChange={(Transparency) =>
                update(id, 'UIStroke', { Transparency })
              }
            />
          </Row>
        </>
      )
    }
    case 'UIGradient': {
      const gradient = resolveModifier(node, 'UIGradient')!
      return (
        <>
          {/* A gradient can have many keypoints; these edit the two ends. */}
          {(['start', 'end'] as const).map((end) => (
            <Row key={end} label={end === 'start' ? 'Start' : 'End'}>
              <ColorField
                label={`UIGradient ${end} color`}
                value={
                  gradient.Color[
                    end === 'start' ? 0 : gradient.Color.length - 1
                  ].color
                }
                onChange={(color) =>
                  update(id, 'UIGradient', {
                    Color: withEnd(gradient.Color, end, { color }),
                  })
                }
              />
              <NumberField
                label={`UIGradient ${end} transparency`}
                min={0}
                max={1}
                value={
                  gradient.Transparency[
                    end === 'start' ? 0 : gradient.Transparency.length - 1
                  ].value
                }
                onChange={(value) =>
                  update(id, 'UIGradient', {
                    Transparency: withEnd(gradient.Transparency, end, {
                      value,
                    }),
                  })
                }
              />
            </Row>
          ))}
          <Row label="Rotation">
            <NumberField
              label="UIGradient Rotation"
              value={gradient.Rotation}
              onChange={(Rotation) => update(id, 'UIGradient', { Rotation })}
            />
          </Row>
        </>
      )
    }
    case 'UIPadding': {
      const padding = resolveModifier(node, 'UIPadding')!
      return (
        <>
          {(
            [
              ['Top', 'PaddingTop'],
              ['Bottom', 'PaddingBottom'],
              ['Left', 'PaddingLeft'],
              ['Right', 'PaddingRight'],
            ] as const
          ).map(([label, key]) => (
            <UDimRow
              key={key}
              label={`Padding ${label}`}
              value={padding[key]}
              onChange={(value) => update(id, 'UIPadding', { [key]: value })}
            />
          ))}
        </>
      )
    }
    case 'UIAspectRatioConstraint': {
      const aspect = resolveModifier(node, 'UIAspectRatioConstraint')!
      return (
        <>
          <Row label="AspectRatio">
            {/* Width ÷ height: 1 is square, 2 is twice as wide as tall. */}
            <NumberField
              label="AspectRatio"
              min={0.01}
              value={aspect.AspectRatio}
              onChange={(AspectRatio) =>
                update(id, 'UIAspectRatioConstraint', { AspectRatio })
              }
            />
          </Row>
        </>
      )
    }
    case 'UIListLayout': {
      const list = resolveModifier(node, 'UIListLayout')!
      return (
        <>
          <Row label="Direction">
            <SelectField
              label="UIListLayout FillDirection"
              value={list.FillDirection}
              options={enumNames(FILL_DIRECTION)}
              onChange={(FillDirection) =>
                update(id, 'UIListLayout', { FillDirection })
              }
            />
          </Row>
          <AlignmentRows
            horizontal={list.HorizontalAlignment}
            vertical={list.VerticalAlignment}
            onChange={(change) => update(id, 'UIListLayout', change)}
          />
          <Row label="Sort by">
            <SelectField
              label="UIListLayout SortOrder"
              value={list.SortOrder}
              options={enumNames(SORT_ORDER)}
              onChange={(SortOrder) =>
                update(id, 'UIListLayout', { SortOrder })
              }
            />
          </Row>
          <UDimRow
            label="Gap"
            value={list.Padding}
            onChange={(Padding) => update(id, 'UIListLayout', { Padding })}
          />
        </>
      )
    }
    case 'UIGridLayout': {
      const grid = resolveModifier(node, 'UIGridLayout')!
      return (
        <>
          <UDim2Row
            label="CellSize"
            value={grid.CellSize}
            onChange={(CellSize) => update(id, 'UIGridLayout', { CellSize })}
          />
          <UDim2Row
            label="CellPadding"
            value={grid.CellPadding}
            onChange={(CellPadding) =>
              update(id, 'UIGridLayout', { CellPadding })
            }
          />
          <Row label="Fill">
            <SelectField
              label="UIGridLayout FillDirection"
              value={grid.FillDirection}
              options={enumNames(FILL_DIRECTION)}
              onChange={(FillDirection) =>
                update(id, 'UIGridLayout', { FillDirection })
              }
            />
          </Row>
          <Row label="Max per line">
            {/* 0 means as many as fit. */}
            <NumberField
              label="UIGridLayout FillDirectionMaxCells"
              integer
              min={0}
              value={grid.FillDirectionMaxCells}
              onChange={(FillDirectionMaxCells) =>
                update(id, 'UIGridLayout', { FillDirectionMaxCells })
              }
            />
          </Row>
          <AlignmentRows
            horizontal={grid.HorizontalAlignment}
            vertical={grid.VerticalAlignment}
            onChange={(change) => update(id, 'UIGridLayout', change)}
          />
          <Row label="Sort by">
            <SelectField
              label="UIGridLayout SortOrder"
              value={grid.SortOrder}
              options={enumNames(SORT_ORDER)}
              onChange={(SortOrder) =>
                update(id, 'UIGridLayout', { SortOrder })
              }
            />
          </Row>
        </>
      )
    }
  }
}

// A layout's horizontal and vertical alignment dropdowns.
function AlignmentRows({
  horizontal,
  vertical,
  onChange,
}: {
  horizontal: HorizontalAlignment
  vertical: VerticalAlignment
  onChange: (change: {
    HorizontalAlignment?: HorizontalAlignment
    VerticalAlignment?: VerticalAlignment
  }) => void
}) {
  return (
    <>
      <Row label="Align X">
        <SelectField
          label="HorizontalAlignment"
          value={horizontal}
          options={enumNames(HORIZONTAL_ALIGNMENT)}
          onChange={(HorizontalAlignment) => onChange({ HorizontalAlignment })}
        />
      </Row>
      <Row label="Align Y">
        <SelectField
          label="VerticalAlignment"
          value={vertical}
          options={enumNames(VERTICAL_ALIGNMENT)}
          onChange={(VerticalAlignment) => onChange({ VerticalAlignment })}
        />
      </Row>
    </>
  )
}
