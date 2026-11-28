import { describe, expect, it } from 'vitest'
import {
  canConnect,
  canTarget,
  chainFrom,
  type LogicGraph,
  searchGraphKinds,
} from './graph.ts'
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

describe('canConnect', () => {
  // When pressed → Show → Hide, and a lone Toggle.
  const graph = (): LogicGraph => {
    const g = chain(['Activated', null], ['Show', null], ['Hide', null])
    g.nodes.lone = {
      id: 'lone',
      kind: 'ToggleVisible',
      at: { x: 0, y: 0 },
      element: null,
    }
    return g
  }

  it('allows a wire into an action, even from a node already wired', () => {
    expect(canConnect(graph(), 'g3', 'lone')).toBe(true)
    expect(canConnect(graph(), 'g1', 'lone')).toBe(true) // replaces g1 → g2
  })

  it('refuses a wire into an event, or to itself', () => {
    expect(canConnect(graph(), 'lone', 'g1')).toBe(false)
    expect(canConnect(graph(), 'g2', 'g2')).toBe(false)
  })

  it('refuses a wire that would make a loop', () => {
    expect(canConnect(graph(), 'g3', 'g2')).toBe(false)
  })

  it('refuses graph nodes that aren’t there', () => {
    expect(canConnect(graph(), 'g1', 'gone')).toBe(false)
  })
})

describe('searchGraphKinds', () => {
  it('lists everything, events first', () => {
    const kinds = searchGraphKinds('')
    expect(kinds.slice(0, 3)).toEqual(['Activated', 'MouseEnter', 'MouseLeave'])
    expect(kinds).toHaveLength(6)
  })

  it('matches titles, hints and Roblox names', () => {
    expect(searchGraphKinds('press')).toEqual(['Activated'])
    expect(searchGraphKinds('clicked')).toEqual(['Activated'])
    expect(searchGraphKinds('mouseenter')).toEqual(['MouseEnter'])
  })

  it('lists only actions after a wire', () => {
    expect(searchGraphKinds('', true)).toEqual([
      'Show',
      'Hide',
      'ToggleVisible',
    ])
  })
})
