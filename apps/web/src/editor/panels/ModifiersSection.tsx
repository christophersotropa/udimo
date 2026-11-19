import { withEnd } from '../../lib/sequence.ts'
import { resolveModifier } from '../../model/modifiers.ts'
import type { ModifierClass, NodeId, UDim } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import {
  CheckboxField,
  ColorField,
  NumberField,
  Row,
  Section,
} from './fields.tsx'

// The Modifiers part of the Properties panel: a checkbox per modifier, and
// that modifier's fields underneath while it's on.
export function ModifiersSection({ id }: { id: NodeId }) {
  const node = useDocumentStore((state) => state.document.nodes[id])
  const addModifier = useDocumentStore((state) => state.addModifier)
  const removeModifier = useDocumentStore((state) => state.removeModifier)
  const update = useDocumentStore((state) => state.updateModifier)
  if (!node) return null

  const corner = resolveModifier(node, 'UICorner')
  const stroke = resolveModifier(node, 'UIStroke')
  const gradient = resolveModifier(node, 'UIGradient')
  const padding = resolveModifier(node, 'UIPadding')
  const aspect = resolveModifier(node, 'UIAspectRatioConstraint')

  // The on/off checkbox for one modifier.
  const toggle = (modifier: ModifierClass, on: boolean) => (
    <Row label={modifier}>
      <CheckboxField
        label={modifier}
        value={on}
        onChange={(checked) =>
          checked ? addModifier(id, modifier) : removeModifier(id, modifier)
        }
      />
    </Row>
  )

  return (
    <Section title="Modifiers">
      {toggle('UICorner', corner !== null)}
      {corner && (
        <UDimRow
          label="Corner radius"
          value={corner.CornerRadius}
          onChange={(CornerRadius) => update(id, 'UICorner', { CornerRadius })}
        />
      )}

      {toggle('UIStroke', stroke !== null)}
      {stroke && (
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
      )}

      {toggle('UIGradient', gradient !== null)}
      {gradient && (
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
      )}

      {toggle('UIPadding', padding !== null)}
      {padding &&
        (
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

      {toggle('UIAspectRatioConstraint', aspect !== null)}
      {aspect && (
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
      )}
    </Section>
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
