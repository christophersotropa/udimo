import { describe, expect, it } from 'vitest'
import { MODIFIER_DEFAULTS, modifierSummary } from './modifiers.ts'

describe('modifierSummary', () => {
  it("describes Studio's defaults", () => {
    expect(modifierSummary('UICorner', MODIFIER_DEFAULTS.UICorner)).toBe('8 px')
    expect(modifierSummary('UIStroke', MODIFIER_DEFAULTS.UIStroke)).toBe('1 px')
    expect(modifierSummary('UIGradient', MODIFIER_DEFAULTS.UIGradient)).toBe(
      'left to right',
    )
    expect(modifierSummary('UIPadding', MODIFIER_DEFAULTS.UIPadding)).toBe(
      '0 px',
    )
    expect(
      modifierSummary(
        'UIAspectRatioConstraint',
        MODIFIER_DEFAULTS.UIAspectRatioConstraint,
      ),
    ).toBe('ratio 1')
    expect(
      modifierSummary('UIListLayout', MODIFIER_DEFAULTS.UIListLayout),
    ).toBe('Vertical, 0 px gap')
    expect(
      modifierSummary('UIGridLayout', MODIFIER_DEFAULTS.UIGridLayout),
    ).toBe('100 × 100 cells')
  })

  it('shows Scale as a percentage, with any Offset added', () => {
    expect(
      modifierSummary('UICorner', { CornerRadius: { s: 0.5, o: 0 } }),
    ).toBe('50%')
    expect(
      modifierSummary('UICorner', { CornerRadius: { s: 0.25, o: 4 } }),
    ).toBe('25% + 4 px')
  })

  it('lists padding sides only when they differ', () => {
    const twelve = { s: 0, o: 12 }
    expect(
      modifierSummary('UIPadding', {
        PaddingTop: twelve,
        PaddingRight: twelve,
        PaddingBottom: twelve,
        PaddingLeft: twelve,
      }),
    ).toBe('12 px')
    expect(
      modifierSummary('UIPadding', {
        ...MODIFIER_DEFAULTS.UIPadding,
        PaddingTop: twelve,
      }),
    ).toBe('12 px / 0 px / 0 px / 0 px')
  })
})
