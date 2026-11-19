import { describe, expect, it } from 'vitest'
import { documentToLuau } from '../export/luau.ts'
import { documentToRbxmx } from '../export/rbxmx.ts'
import { absoluteBox } from '../model/layout.ts'
import { MODIFIER_CLASSES } from '../model/modifiers.ts'
import { parseProject, serializeProject } from '../model/project.ts'
import { DEVICES } from '../model/screen.ts'
import type { NodeId, UiDocument } from '../model/types.ts'
import { exportWarnings } from '../model/warnings.ts'
import { createPetInventoryDocument } from './petInventory.ts'

const doc = createPetInventoryDocument()
const PC = DEVICES.pc

// The tree as indented text, like the diagram in PLAN.md: "Class Name",
// with modifiers in brackets, children indented under their parent.
function outline(
  document: UiDocument,
  id = document.rootId,
  depth = 0,
): string[] {
  const node = document.nodes[id]
  const modifiers = MODIFIER_CLASSES.filter((m) => node.modifiers?.[m])
  const line =
    '  '.repeat(depth) +
    `${node.className} ${node.name}` +
    (modifiers.length > 0 ? ` [${modifiers.join(', ')}]` : '')
  return [
    line,
    ...node.children.flatMap((childId) =>
      outline(document, childId, depth + 1),
    ),
  ]
}

// The first element with this name (searching the whole tree).
function find(name: string): NodeId {
  const node = Object.values(doc.nodes).find((n) => n.name === name)
  if (!node) throw new Error(`No element named ${name}`)
  return node.id
}

describe('the Pet Inventory reference', () => {
  it("matches the plan's diagram", () => {
    const slot = [
      '      Frame PetSlot [UICorner, UIStroke]',
      '        ImageLabel PetIcon [UIAspectRatioConstraint]',
      '        TextLabel PetName',
      '        Frame SelectedDot [UICorner]',
    ]
    expect(outline(doc)).toEqual([
      'ScreenGui PetInventoryGui',
      '  Frame Window [UICorner, UIStroke]',
      '    Frame Header [UICorner, UIGradient]',
      '      ImageLabel PawIcon',
      '      TextLabel Title [UIStroke]',
      '    ImageButton CloseButton [UICorner]',
      '    ScrollingFrame PetGrid [UIPadding, UIGridLayout]',
      ...slot,
      ...slot,
      ...slot,
      ...slot,
      ...slot,
      ...slot,
      '    Frame DetailsPanel [UICorner, UIStroke, UIPadding, UIListLayout]',
      '      TextLabel PetName',
      '      TextLabel Rarity',
      '      ImageLabel PetImage [UIAspectRatioConstraint]',
      '      TextLabel Level',
      '      Frame XPBar [UICorner]',
      '        Frame Fill [UICorner, UIGradient]',
      '      TextButton EquipButton [UICorner, UIPadding]',
      '      ImageButton DeleteButton [UICorner, UIAspectRatioConstraint]',
    ])
  })

  it('lays the grid out in three columns', () => {
    const slots = doc.nodes[find('PetGrid')].children.map((id) =>
      absoluteBox(doc, id, PC),
    )
    expect(slots[0].y).toBeCloseTo(slots[2].y) // one row...
    expect(slots[1].x).toBeGreaterThan(slots[0].x)
    expect(slots[2].x).toBeGreaterThan(slots[1].x)
    expect(slots[3].y).toBeGreaterThan(slots[0].y) // ...then the next
    expect(slots[3].x).toBeCloseTo(slots[0].x)
  })

  it("centers the close button on the window's top-right corner", () => {
    const window = absoluteBox(doc, find('Window'), PC)
    const button = absoluteBox(doc, find('CloseButton'), PC)
    expect(button.x + button.width / 2).toBeCloseTo(window.x + window.width)
    expect(button.y + button.height / 2).toBeCloseTo(window.y)
  })

  it('fills 65% of the XP bar', () => {
    const bar = absoluteBox(doc, find('XPBar'), PC)
    const fill = absoluteBox(doc, find('Fill'), PC)
    expect(fill.width / bar.width).toBeCloseTo(0.65)
  })

  it('only warns about its placeholder images and repeated slot names', () => {
    // No text overflow or off-screen elements on any device.
    const kinds = new Set(exportWarnings(doc).map((w) => w.key.split(':')[0]))
    expect([...kinds].sort()).toEqual(['image', 'names'])
  })

  it('survives export, the Luau script, and saving and opening', () => {
    const elements = Object.keys(doc.nodes).length
    const modifiers = Object.values(doc.nodes).reduce(
      (sum, node) => sum + Object.keys(node.modifiers ?? {}).length,
      0,
    )
    const items = documentToRbxmx(doc).match(/<Item class=/g)!.length
    expect(items).toBe(elements + modifiers)
    expect(documentToLuau(doc).match(/make\("/g)!.length).toBe(
      elements + modifiers,
    )
    expect(parseProject(serializeProject(doc))).toEqual(doc)
  })
})
