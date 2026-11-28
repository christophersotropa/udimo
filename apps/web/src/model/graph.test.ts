import { describe, expect, it } from 'vitest'
import { canTarget, chainFrom, type LogicGraph } from './graph.ts'
import { chain, shopDocument } from './testGraphs.ts'

describe('chainFrom', () => {
  it('follows the wires from an event, in order', () => {
    const graph = chain(
      ['Activated', 'a'],
      ['Show', 'b'],
      ['Hide', 'c'],
      ['ToggleVisible', 'd'],
    )
    expect(chainFrom(graph, 'g1').map((node) => node.id)).toEqual([
      'g2',
      'g3',
      'g4',
    ])
  })

  it('is empty for an event with nothing after it', () => {
    expect(chainFrom(chain(['Activated', 'a']), 'g1')).toEqual([])
  })

  it('stops where the wires loop back', () => {
    const graph: LogicGraph = chain(
      ['Activated', 'a'],
      ['Show', 'b'],
      ['Hide', 'c'],
    )
    graph.wires.push({ id: 'loop', from: 'g3', to: 'g2' })
    expect(chainFrom(graph, 'g1').map((node) => node.id)).toEqual(['g2', 'g3'])
  })
})

describe('canTarget', () => {
  const { doc, shop, buy } = shopDocument()
  const pressed = chain(['Activated', null]).nodes.g1
  const show = chain(['Show', null]).nodes.g1

  it('lets a press event point only at buttons', () => {
    expect(canTarget(doc, pressed, buy)).toBe(true)
    expect(canTarget(doc, pressed, shop)).toBe(false)
  })

  it('lets an action point at any element, but not the ScreenGui', () => {
    expect(canTarget(doc, show, shop)).toBe(true)
    expect(canTarget(doc, show, doc.rootId)).toBe(false)
  })

  it('refuses no element, or one that is gone', () => {
    expect(canTarget(doc, show, null)).toBe(false)
    expect(canTarget(doc, show, 'deleted')).toBe(false)
  })
})
