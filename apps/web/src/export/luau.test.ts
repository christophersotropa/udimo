import { describe, expect, it } from 'vitest'
import { createSampleDocument } from '../app/sampleDocument.ts'
import { createDocumentStore } from '../store/documentStore.ts'
import { documentToLuau, luauString } from './luau.ts'

// The block of `make("ClassName", ...)` for the first instance of a class,
// up to its closing "})".
function makeCall(script: string, className: string): string {
  const start = script.indexOf(`make("${className}"`)
  if (start === -1) throw new Error(`No ${className} in script`)
  return script.slice(start, script.indexOf('})', start) + 2)
}

describe('luauString', () => {
  it('escapes quotes, backslashes, line breaks and control characters', () => {
    expect(luauString('Say "hi"')).toBe('"Say \\"hi\\""')
    expect(luauString('a\\b')).toBe('"a\\\\b"')
    expect(luauString('one\ntwo')).toBe('"one\\ntwo"')
    expect(luauString('bell\u0007')).toBe('"bell\\007"')
    expect(luauString('Coins 🪙')).toBe('"Coins 🪙"') // other text stays as is
  })
})

describe('documentToLuau', () => {
  const script = documentToLuau(createSampleDocument())

  it('puts the ScreenGui in StarterGui and selects it', () => {
    expect(script).toContain(
      'made[1] = make("ScreenGui", game:GetService("StarterGui"), {',
    )
    expect(script).toContain('ZIndexBehavior = Enum.ZIndexBehavior.Sibling,')
    expect(script).toContain('game:GetService("Selection"):Set({ made[1] })')
  })

  it('makes every element and modifier once, inside its parent', () => {
    // 5 elements (ShopGui, CoinCounter, Window, Title, BuyButton) and
    // 3 modifiers: the Window's UICorner and UIStroke, BuyButton's UICorner.
    expect(script.match(/make\("/g)).toHaveLength(8)
    expect(script).toContain('made[2] = make("Frame", made[1], {') // Window
    expect(script).toContain('make("UIStroke", made[2], {')
    expect(script).toContain('made[3] = make("TextButton", made[2], {') // Buy
  })

  it('writes values as Roblox types', () => {
    const coins = makeCall(script, 'TextLabel')
    expect(coins).toContain('Position = UDim2.new(0, 24, 0, 24),')
    expect(coins).toContain('AnchorPoint = Vector2.new(0, 0),')
    expect(coins).toContain('BackgroundColor3 = Color3.fromRGB(20, 20, 30),')
    expect(coins).toContain('Text = "Coins: 120",')
    expect(coins).toContain(
      'FontFace = Font.new("rbxasset://fonts/families/SourceSansPro.json", Enum.FontWeight.Regular, Enum.FontStyle.Normal),',
    )
    expect(makeCall(script, 'UICorner')).toContain(
      'CornerRadius = UDim.new(0, 16),',
    )
  })

  it('leaves out properties only the .rbxmx file uses', () => {
    expect(script).not.toContain('TopLeftRadius')
    expect(script).not.toContain('ImageContent')
  })

  it('writes images, enums and sequences', () => {
    const store = createDocumentStore()
    const { addNode, addModifier, updateModifier } = store.getState()
    const root = store.getState().document.rootId
    const panel = addNode(root, 'Frame')
    addModifier(panel, 'UIListLayout')
    updateModifier(panel, 'UIListLayout', { FillDirection: 'Horizontal' })
    addModifier(panel, 'UIGradient')
    updateModifier(panel, 'UIGradient', {
      Transparency: [
        { time: 0, value: 0 },
        { time: 1, value: 0.5 },
      ],
    })
    addNode(panel, 'ImageLabel', { Image: '123456' })
    const luau = documentToLuau(store.getState().document)

    expect(luau).toContain('FillDirection = Enum.FillDirection.Horizontal,')
    expect(luau).toContain(
      'Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(1, 0.5) }),',
    )
    expect(luau).toContain(
      'Color = ColorSequence.new({ ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 255, 255)), ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 255, 255)) }),',
    )
    expect(luau).toContain('Image = "rbxassetid://123456",')
  })

  it('writes font weights by name', () => {
    const store = createDocumentStore()
    store.getState().addNode(store.getState().document.rootId, 'TextLabel', {
      FontFace: { family: 'Roboto', weight: 'Thin' },
    })
    expect(documentToLuau(store.getState().document)).toContain(
      'Font.new("rbxasset://fonts/families/Roboto.json", Enum.FontWeight.Thin, Enum.FontStyle.Normal)',
    )
  })

  it('writes italic text', () => {
    const store = createDocumentStore()
    store.getState().addNode(store.getState().document.rootId, 'TextLabel', {
      FontFace: { family: 'Roboto', weight: 'Bold', style: 'Italic' },
    })
    expect(documentToLuau(store.getState().document)).toContain(
      'Font.new("rbxasset://fonts/families/Roboto.json", Enum.FontWeight.Bold, Enum.FontStyle.Italic)',
    )
  })

  it('keeps working past 200 elements (Luau allows 200 local variables)', () => {
    const store = createDocumentStore()
    const { addNode } = store.getState()
    let parent = store.getState().document.rootId
    for (let i = 0; i < 250; i++) parent = addNode(parent, 'Frame')
    const luau = documentToLuau(store.getState().document)
    expect(luau.match(/^local /gm)).toHaveLength(2) // make and made only
    expect(luau).toContain('made[250] = make("Frame", made[249], {')
  })

  it('escapes names safely', () => {
    const store = createDocumentStore()
    store.getState().renameNode(store.getState().document.rootId, 'My "Gui"')
    expect(documentToLuau(store.getState().document)).toContain(
      'Name = "My \\"Gui\\"",',
    )
  })
})
