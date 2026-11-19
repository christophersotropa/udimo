import { useState } from 'react'
import { withEnd } from '../../lib/sequence.ts'
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
import type { ModifierClass, NodeId, UDim } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { MenuItem, Popover } from '../ui/Popover.tsx'
import { Switch } from '../ui/Switch.tsx'
import {
  ColorField,
  NumberField,
  Row,
  Section,
  SelectField,
  UDim2Rows,
} from './fields.tsx'
import { ChevronIcon, PlusIcon } from './icons.tsx'

// The modifiers listed even while they're off, so they're one switch away:
// the ones most UIs use. Others are added with "+ Add modifier".
const COMMON: ModifierClass[] = [
  'UICorner',
  'UIStroke',
  'UIGradient',
  'UIPadding',
]

// The Modifiers part of the Properties panel: a card per modifier, with an
// on/off switch and a summary ("UICorner · 14 px"). Clicking a card that's
// on opens its fields.
export function ModifiersSection({ id }: { id: NodeId }) {
  const node = useDocumentStore((state) => state.document.nodes[id])
  const { addModifier, removeModifier } = useDocumentStore.getState()
  // Which cards are open. Only this panel cares, so it's React state.
  const [expanded, setExpanded] = useState<ReadonlySet<ModifierClass>>(
    new Set(),
  )
  if (!node) return null

  const isOn = (m: ModifierClass) => Boolean(node.modifiers?.[m])
  const listed = MODIFIER_CLASSES.filter((m) => COMMON.includes(m) || isOn(m))
  const addable = MODIFIER_CLASSES.filter((m) => !listed.includes(m))

  const setOpen = (m: ModifierClass, open: boolean) =>
    setExpanded((previous) => {
      const next = new Set(previous)
      if (open) next.add(m)
      else next.delete(m)
      return next
    })

  // Turning a modifier on opens its card, ready to adjust.
  function turnOn(m: ModifierClass) {
    addModifier(id, m)
    setOpen(m, true)
  }

  return (
    <Section title="Modifiers">
      {listed.map((m) => {
        const props = resolveModifier(node, m)
        return (
          <div key={m} className="rounded-lg bg-raised ring-1 ring-line">
            <div className="flex items-center gap-2 py-1.5 pr-2.5 pl-2">
              <button
                type="button"
                disabled={!props}
                aria-expanded={props ? expanded.has(m) : undefined}
                onClick={() => setOpen(m, !expanded.has(m))}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded py-0.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-accent"
              >
                <ChevronIcon
                  className={`shrink-0 text-faint transition-transform ${
                    props ? '' : 'opacity-0'
                  } ${expanded.has(m) ? 'rotate-90' : ''}`}
                />
                <span className="truncate text-ink">{m}</span>
                <span className="truncate text-muted">
                  · {props ? modifierSummary(m, props) : 'off'}
                </span>
              </button>
              <Switch
                label={m}
                checked={props !== null}
                onChange={(on) => (on ? turnOn(m) : removeModifier(id, m))}
              />
            </div>
            {props && expanded.has(m) && (
              <div className="space-y-2 border-t border-line px-2.5 py-2.5">
                <ModifierFields id={id} modifier={m} />
              </div>
            )}
          </div>
        )
      })}

      {addable.length > 0 && (
        <Popover
          width="w-full"
          trigger={({ open, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-sm text-muted ring-1 ring-line ring-dashed hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <PlusIcon /> Add modifier
            </button>
          )}
        >
          {(close) =>
            addable.map((m) => (
              <MenuItem
                key={m}
                onClick={() => {
                  close()
                  turnOn(m)
                }}
              >
                {m}
              </MenuItem>
            ))
          }
        </Popover>
      )}
    </Section>
  )
}

// One modifier's fields, shown inside its card. Cards only show fields for
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
          <UDim2Rows
            name="CellSize"
            value={grid.CellSize}
            onChange={(CellSize) => update(id, 'UIGridLayout', { CellSize })}
          />
          <UDim2Rows
            name="CellPadding"
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

// A UDim (Scale + Offset) on one row.
function UDimRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: UDim
  onChange: (value: UDim) => void
}) {
  return (
    <Row label={label}>
      <NumberField
        label={`${label} Scale`}
        value={value.s}
        onChange={(s) => onChange({ ...value, s })}
      />
      <NumberField
        label={`${label} Offset`}
        integer
        value={value.o}
        onChange={(o) => onChange({ ...value, o })}
      />
    </Row>
  )
}
