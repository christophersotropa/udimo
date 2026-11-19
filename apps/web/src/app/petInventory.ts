import { color3FromRgb } from '../lib/color.ts'
import type {
  ModifierClass,
  ModifierProps,
  NodeId,
  Props,
  UiDocument,
} from '../model/types.ts'
import {
  createDocumentStore,
  type ElementClassName,
} from '../store/documentStore.ts'

// The Pet Inventory: the reference layout from PLAN.md ("Reference test
// case"). Phase 1 is done when Udimo can build it and Studio shows the
// export looking the same. It uses nearly every feature: modifiers, a grid
// inside a ScrollingFrame, a list layout, fonts, outlined text, a corner
// button with AnchorPoint (0.5, 0.5), and a Scale-sized progress bar.
//
// Placeholder shapes only, no game art: images use Studio's placeholder
// picture. Built with a throwaway store, so it follows the same rules as
// any edit.

const rgb = color3FromRgb
const WHITE = rgb(255, 255, 255)
const PANEL = rgb(40, 42, 60)
const GOLD = rgb(255, 200, 80)
const GREEN = rgb(70, 200, 110)
const RED = rgb(220, 70, 70)

export function createPetInventoryDocument(): UiDocument {
  const store = createDocumentStore()
  const { addNode, renameNode, addModifier, updateModifier } = store.getState()

  // Adds a named element.
  function add(
    parent: NodeId,
    className: ElementClassName,
    name: string,
    props: Props,
  ): NodeId {
    const id = addNode(parent, className, props)
    renameNode(id, name)
    return id
  }
  // Adds a modifier with some of its properties set.
  function modify<K extends ModifierClass>(
    id: NodeId,
    modifier: K,
    props: ModifierProps[K] = {},
  ) {
    addModifier(id, modifier)
    updateModifier(id, modifier, props)
  }
  const corner = (id: NodeId, s: number, o: number) =>
    modify(id, 'UICorner', { CornerRadius: { s, o } })

  const root = store.getState().document.rootId
  renameNode(root, 'PetInventoryGui')

  // ---- The window: centered, 60% × 70% of the screen.
  const window = add(root, 'Frame', 'Window', {
    AnchorPoint: { x: 0.5, y: 0.5 },
    Position: { xs: 0.5, xo: 0, ys: 0.5, yo: 0 },
    Size: { xs: 0.6, xo: 0, ys: 0.7, yo: 0 },
    BackgroundColor3: rgb(30, 32, 48),
  })
  corner(window, 0, 16)
  modify(window, 'UIStroke', { Color: GOLD, Thickness: 4 }) // thick

  // ---- Header: a strip across the top, with a gradient.
  const header = add(window, 'Frame', 'Header', {
    Size: { xs: 1, xo: 0, ys: 0, yo: 72 },
    BackgroundColor3: WHITE, // the gradient's colors show as they are
  })
  corner(header, 0, 16)
  modify(header, 'UIGradient', {
    Color: [
      { time: 0, color: rgb(90, 70, 160) },
      { time: 1, color: rgb(60, 110, 190) },
    ],
  })
  add(header, 'ImageLabel', 'PawIcon', {
    AnchorPoint: { x: 0, y: 0.5 },
    Position: { xs: 0, xo: 16, ys: 0.5, yo: 0 },
    Size: { xs: 0, xo: 48, ys: 0, yo: 48 },
    BackgroundTransparency: 1,
  })
  const title = add(header, 'TextLabel', 'Title', {
    Position: { xs: 0, xo: 76, ys: 0, yo: 0 },
    Size: { xs: 0.5, xo: 0, ys: 1, yo: 0 },
    BackgroundTransparency: 1,
    Text: 'Pets',
    TextColor3: WHITE,
    TextSize: 36,
    FontFace: { family: 'FredokaOne', weight: 'Regular' },
  })
  modify(title, 'UIStroke', { Thickness: 2 }) // outlined text (Contextual)

  // ---- Close button: centered on the window's top-right corner.
  const close = add(window, 'ImageButton', 'CloseButton', {
    AnchorPoint: { x: 0.5, y: 0.5 },
    Position: { xs: 1, xo: 0, ys: 0, yo: 0 },
    Size: { xs: 0, xo: 48, ys: 0, yo: 48 },
    BackgroundColor3: RED,
    ZIndex: 2,
  })
  corner(close, 0.5, 0) // a circle

  // ---- Pet grid: the left 60%, scrolling, three columns of slots.
  const grid = add(window, 'ScrollingFrame', 'PetGrid', {
    Position: { xs: 0, xo: 16, ys: 0, yo: 88 },
    Size: { xs: 0.6, xo: -24, ys: 1, yo: -104 },
    BackgroundColor3: PANEL,
    CanvasSize: { xs: 0, xo: 0, ys: 1.5, yo: 0 },
    ScrollBarThickness: 8,
  })
  modify(grid, 'UIGridLayout', {
    // A third of the width, minus the gaps: exactly three per row.
    CellSize: { xs: 0.3333, xo: -8, ys: 0, yo: 150 },
    CellPadding: { xs: 0, xo: 8, ys: 0, yo: 8 },
  })
  modify(grid, 'UIPadding', {
    PaddingTop: { s: 0, o: 8 },
    PaddingBottom: { s: 0, o: 8 },
    PaddingLeft: { s: 0, o: 8 },
    PaddingRight: { s: 0, o: 8 },
  })
  for (let i = 1; i <= 6; i++) {
    const slot = add(grid, 'Frame', 'PetSlot', {
      BackgroundColor3: rgb(55, 58, 80),
      LayoutOrder: i,
    })
    corner(slot, 0, 12)
    modify(slot, 'UIStroke', { Color: rgb(90, 95, 130), Thickness: 2 })
    const icon = add(slot, 'ImageLabel', 'PetIcon', {
      AnchorPoint: { x: 0.5, y: 0 },
      Position: { xs: 0.5, xo: 0, ys: 0, yo: 10 },
      Size: { xs: 0.6, xo: 0, ys: 0.6, yo: 0 },
      BackgroundTransparency: 1,
    })
    modify(icon, 'UIAspectRatioConstraint') // stays square
    add(slot, 'TextLabel', 'PetName', {
      Position: { xs: 0, xo: 8, ys: 1, yo: -34 },
      Size: { xs: 1, xo: -16, ys: 0, yo: 24 },
      BackgroundTransparency: 1,
      Text: `Pet ${i}`,
      TextColor3: WHITE,
      TextScaled: true,
    })
    const dot = add(slot, 'Frame', 'SelectedDot', {
      AnchorPoint: { x: 1, y: 0 },
      Position: { xs: 1, xo: -10, ys: 0, yo: 10 },
      Size: { xs: 0, xo: 12, ys: 0, yo: 12 },
      BackgroundColor3: GREEN,
      Visible: i === 1, // only the first pet is selected
    })
    corner(dot, 0.5, 0)
  }

  // ---- Details: the right 40%, a column of facts about the selected pet.
  const details = add(window, 'Frame', 'DetailsPanel', {
    AnchorPoint: { x: 1, y: 0 },
    Position: { xs: 1, xo: -16, ys: 0, yo: 88 },
    Size: { xs: 0.4, xo: -24, ys: 1, yo: -104 },
    BackgroundColor3: PANEL,
  })
  corner(details, 0, 12)
  modify(details, 'UIStroke', { Color: rgb(90, 95, 130), Thickness: 2 })
  // Heights are Scale (fractions of the panel's inside), with TextScaled
  // text, so the column fits any screen. (Fixed pixel heights ran off the
  // bottom on phones: the export warnings caught it.) They add up to 0.95,
  // gaps included.
  modify(details, 'UIListLayout', {
    HorizontalAlignment: 'Center',
    Padding: { s: 0.015, o: 0 },
  })
  modify(details, 'UIPadding', {
    PaddingTop: { s: 0, o: 12 },
    PaddingBottom: { s: 0, o: 12 },
  })
  const text = (name: string, value: string, height: number, props: Props) =>
    add(details, 'TextLabel', name, {
      Size: { xs: 0.9, xo: 0, ys: height, yo: 0 },
      BackgroundTransparency: 1,
      Text: value,
      TextColor3: WHITE,
      TextScaled: true,
      ...props,
    })
  text('PetName', 'Pet 1', 0.12, {
    FontFace: { family: 'FredokaOne', weight: 'Regular' },
  })
  text('Rarity', 'Legendary', 0.08, {
    TextColor3: GOLD,
    FontFace: { family: 'Roboto', weight: 'Bold' },
  })
  const image = add(details, 'ImageLabel', 'PetImage', {
    Size: { xs: 0.9, xo: 0, ys: 0.25, yo: 0 },
    BackgroundTransparency: 1,
  })
  modify(image, 'UIAspectRatioConstraint') // a square, as tall as its row
  text('Level', 'Level 12', 0.08, {
    FontFace: { family: 'BuilderSans', weight: 'Regular' },
  })
  const xpBar = add(details, 'Frame', 'XPBar', {
    Size: { xs: 0.9, xo: 0, ys: 0.05, yo: 0 },
    BackgroundColor3: rgb(25, 25, 35),
  })
  corner(xpBar, 0.5, 0)
  const fill = add(xpBar, 'Frame', 'Fill', {
    Size: { xs: 0.65, xo: 0, ys: 1, yo: 0 }, // 65% of the way to the next level
    BackgroundColor3: WHITE,
  })
  corner(fill, 0.5, 0)
  modify(fill, 'UIGradient', {
    Color: [
      { time: 0, color: GREEN },
      { time: 1, color: rgb(150, 240, 120) },
    ],
  })
  const equip = add(details, 'TextButton', 'EquipButton', {
    Size: { xs: 0.9, xo: 0, ys: 0.14, yo: 0 },
    BackgroundColor3: GREEN,
    Text: 'Equip',
    TextColor3: WHITE,
    TextScaled: true,
    FontFace: { family: 'Roboto', weight: 'Bold' },
  })
  corner(equip, 0, 8)
  modify(equip, 'UIPadding', {
    PaddingTop: { s: 0.2, o: 0 },
    PaddingBottom: { s: 0.2, o: 0 },
  })
  const remove = add(details, 'ImageButton', 'DeleteButton', {
    Size: { xs: 0.9, xo: 0, ys: 0.14, yo: 0 },
    BackgroundColor3: RED,
  })
  modify(remove, 'UIAspectRatioConstraint') // a square, as tall as its row
  corner(remove, 0, 8)

  return store.getState().document
}
