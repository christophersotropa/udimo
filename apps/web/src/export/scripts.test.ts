import { describe, expect, it } from 'vitest'
import { createSampleDocument } from '../app/sampleDocument.ts'
import { createDocumentStore } from '../store/documentStore.ts'
import { documentToLuau } from './luau.ts'
import { documentToRbxmx } from './rbxmx.ts'
import { buttonScriptSource, luauIdentifier } from './scripts.ts'

describe('luauIdentifier', () => {
  it('makes camelCase variable names from element names', () => {
    expect(luauIdentifier('BuyButton', new Set())).toBe('buyButton')
    expect(luauIdentifier('Buy button!', new Set())).toBe('buyButton')
  })

  it('avoids numbers first, keywords, and names already used', () => {
    expect(luauIdentifier('2x Boost', new Set())).toBe('button2xBoost')
    expect(luauIdentifier('End', new Set())).toBe('endButton')
    expect(luauIdentifier('???', new Set())).toBe('button')
    const used = new Set<string>()
    expect(luauIdentifier('Buy', used)).toBe('buy')
    expect(luauIdentifier('Buy', used)).toBe('buy2')
  })
})

describe('buttonScriptSource', () => {
  it('has an empty handler for every button, found by name', () => {
    const source = buttonScriptSource(createSampleDocument())!
    expect(source).toContain('local gui = script.Parent')
    expect(source).toContain(
      'local buyButton = gui:WaitForChild("Window"):WaitForChild("BuyButton")',
    )
    expect(source).toContain('buyButton.Activated:Connect(function()')
    expect(source).toContain('end)')
  })

  it('is null when there are no buttons', () => {
    expect(
      buttonScriptSource(createDocumentStore().getState().document),
    ).toBeNull()
  })

  it('warns when a shared name makes a path ambiguous', () => {
    const store = createDocumentStore()
    const { addNode } = store.getState()
    const root = store.getState().document.rootId
    addNode(root, 'TextButton')
    addNode(root, 'TextButton') // two called "TextButton"
    const source = buttonScriptSource(store.getState().document)!
    expect(source).toContain(
      'more than one element along this path shares a name',
    )
    expect(source).toContain('local textButton2 =') // still unique variables
  })
})

describe('the script in the exports', () => {
  it('is a LocalScript inside the ScreenGui, only when asked for', () => {
    const doc = createSampleDocument()
    expect(documentToRbxmx(doc)).not.toContain('LocalScript')

    const xml = documentToRbxmx(doc, { buttonScript: true })
    expect(xml).toContain('<Item class="LocalScript"')
    expect(xml).toContain('<string name="Name">ButtonHandlers</string>')
    expect(xml).toContain(
      '<ProtectedString name="Source"><![CDATA[-- Made with Udimo',
    )

    expect(documentToLuau(doc, { buttonScript: true })).toContain(
      'make("LocalScript", made[1], {',
    )
  })

  it('keeps code with "]]>" in it intact in the XML', () => {
    const store = createDocumentStore()
    const id = store
      .getState()
      .addNode(store.getState().document.rootId, 'TextButton')
    store.getState().renameNode(id, 'a]]>b')
    const xml = documentToRbxmx(store.getState().document, {
      buttonScript: true,
    })
    // The CDATA is split around "]]>", so nothing ends early.
    expect(xml).toContain('a]]]]><![CDATA[>b')
  })
})
