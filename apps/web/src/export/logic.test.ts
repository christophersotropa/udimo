import { describe, expect, it } from 'vitest'
import {
  chain,
  shopDocument,
  together,
  withLogic,
} from '../model/testGraphs.ts'
import { logicScriptSource } from './logic.ts'

const HEADER = [
  "-- Made with Udimo from this ScreenGui's logic graph. To change what it",
  '-- does, edit the graph in Udimo and export again: changes made here are',
  '-- replaced by the next export.',
  '',
  'local gui = script.Parent',
  '',
]

describe('logicScriptSource', () => {
  it('writes a readable handler for each event', () => {
    const { doc, buy, window } = shopDocument()
    const logic = chain(['Activated', buy], ['Show', window], ['Hide', buy])
    expect(logicScriptSource(withLogic(doc, logic))).toBe(
      [
        ...HEADER,
        'local buyButton = gui:WaitForChild("Shop"):WaitForChild("BuyButton")',
        'local shopWindow = gui:WaitForChild("ShopWindow")',
        '',
        '-- When BuyButton is pressed',
        'buyButton.Activated:Connect(function()',
        '\tshopWindow.Visible = true',
        '\tbuyButton.Visible = false',
        'end)',
        '',
      ].join('\n'),
    )
  })

  it('writes hover events and toggles', () => {
    const { doc, shop, window } = shopDocument()
    const logic = together(
      chain(['MouseLeave', shop], ['ToggleVisible', window]),
      chain(['MouseEnter', shop], ['Show', window]),
    )
    const source = logicScriptSource(withLogic(doc, logic))!
    // Entering is listed before leaving, whatever order they were added in.
    expect(source).toContain(
      [
        '-- When the mouse moves onto Shop',
        'shop.MouseEnter:Connect(function()',
        '\tshopWindow.Visible = true',
        'end)',
        '',
        '-- When the mouse moves off Shop',
        'shop.MouseLeave:Connect(function()',
        '\tshopWindow.Visible = not shopWindow.Visible',
        'end)',
      ].join('\n'),
    )
  })

  it('lists handlers and variables in Explorer order', () => {
    const { doc, shop, buy, window } = shopDocument()
    const logic = together(
      chain(['MouseEnter', window], ['Hide', shop]),
      chain(['Activated', buy], ['Show', window]),
    )
    const source = logicScriptSource(withLogic(doc, logic))!
    expect(source.indexOf('local shop =')).toBeLessThan(
      source.indexOf('local buyButton ='),
    )
    expect(source.indexOf('buyButton.Activated')).toBeLessThan(
      source.indexOf('shopWindow.MouseEnter'),
    )
  })

  it('leaves out graph nodes without a usable element', () => {
    const { doc, shop, buy, window } = shopDocument()
    const logic = chain(
      ['Activated', buy],
      ['Show', null], // nothing picked yet
      ['Hide', 'deleted'], // its element is gone
      ['Show', window],
    )
    const source = logicScriptSource(withLogic(doc, logic))!
    expect(source).toContain(
      'buyButton.Activated:Connect(function()\n\tshopWindow.Visible = true\nend)',
    )
    // A press event on a Frame (not a button) makes no handler at all.
    const onFrame = chain(['Activated', shop], ['Show', window])
    expect(logicScriptSource(withLogic(doc, onFrame))).toBeNull()
  })

  it('is null when the graph does nothing', () => {
    const { doc, buy } = shopDocument()
    expect(logicScriptSource(doc)).toBeNull()
    // An event with no action after it.
    expect(
      logicScriptSource(withLogic(doc, chain(['Activated', buy]))),
    ).toBeNull()
  })

  it('notes a path that a shared name makes ambiguous', () => {
    const { doc, store, shop, buy } = shopDocument()
    const twin = store.getState().addNode(shop, 'TextButton')
    store.getState().renameNode(twin, 'BuyButton')
    const logic = chain(['Activated', buy], ['Hide', shop])
    const shared = store.getState().document
    expect(doc).not.toBe(shared)
    expect(logicScriptSource(withLogic(shared, logic))).toContain(
      '-- WaitForChild finds the first one. Give them different names.\nlocal buyButton =',
    )
  })
})
