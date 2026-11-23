import type { ColorKeypoint, NumberKeypoint } from '../model/types.ts'
import {
  childNamed,
  elementsOf,
  parseXml,
  textOf,
  type XmlElement,
} from './xml.ts'

// Reads an .rbxmx file (Roblox's XML model format, version 4) into a tree
// of instances with typed property values: the reverse of export/rbxmx.ts.
// It knows Roblox's value types, not Udimo's classes; toDocument.ts decides
// what becomes part of the design.
// Reference: https://dom.rojo.space/xml.html and docs/reference/.

// One property value, by its Roblox type. Enums ("tokens") stay numbers
// here; toDocument.ts knows which enum each property uses.
export type RawValue =
  | { type: 'string'; value: string }
  | { type: 'bool'; value: boolean }
  | { type: 'number'; value: number } // int and float alike
  | { type: 'token'; value: number }
  | { type: 'UDim'; s: number; o: number }
  | { type: 'UDim2'; xs: number; xo: number; ys: number; yo: number }
  | { type: 'Vector2'; x: number; y: number }
  | { type: 'Rect'; minX: number; minY: number; maxX: number; maxY: number }
  | { type: 'Color3'; r: number; g: number; b: number }
  | { type: 'Content'; value: string } // '' when there is none
  | { type: 'Font'; family: string; weight: number; style: string }
  | { type: 'ColorSequence'; value: ColorKeypoint[] }
  | { type: 'NumberSequence'; value: NumberKeypoint[] }

export type RawInstance = {
  className: string
  properties: Map<string, RawValue>
  // Properties of a type Udimo reads whose value couldn't be read (say, a
  // number that isn't one). Reported, so nothing vanishes silently.
  unreadable: string[]
  children: RawInstance[]
}

export class RbxmxError extends Error {}

// A number from an element's text; NaN when it isn't one.
const numberIn = (element: XmlElement | undefined): number =>
  element ? Number(textOf(element).trim()) : NaN

// Several numbered parts at once (<XS>, <XO>...), or null if any is
// missing or isn't a number.
function numbers<K extends string>(
  element: XmlElement,
  names: readonly K[],
): Record<K, number> | null {
  const out = {} as Record<K, number>
  for (const name of names) {
    const n = numberIn(childNamed(element, name))
    if (!Number.isFinite(n)) return null
    out[name] = n
  }
  return out
}

// A colour packed into one number, 0xAARRGGBB, as Roblox's Color3uint8
// (and older Color3) values are written: back to 0..1 per channel.
function unpackColor(packed: number): RawValue | null {
  if (!Number.isInteger(packed)) return null
  return {
    type: 'Color3',
    r: ((packed >>> 16) & 255) / 255,
    g: ((packed >>> 8) & 255) / 255,
    b: (packed & 255) / 255,
  }
}

// A sequence's numbers, in groups of `size` per keypoint, or null if the
// count or any number is off.
function groups(text: string, size: number): number[][] | null {
  const all = text.trim().split(/\s+/).filter(Boolean).map(Number)
  if (all.length === 0 || all.length % size !== 0) return null
  if (!all.every(Number.isFinite)) return null
  const out: number[][] = []
  for (let i = 0; i < all.length; i += size) out.push(all.slice(i, i + size))
  return out
}

// One property tag as a typed value: undefined for a type Udimo doesn't
// read at all (Refs, BinaryString...), null for a value it couldn't read.
function readValue(tag: XmlElement): RawValue | null | undefined {
  const text = textOf(tag)
  switch (tag.name) {
    case 'string':
    case 'ProtectedString':
      return { type: 'string', value: text }
    case 'bool': {
      const word = text.trim()
      return word === 'true' || word === 'false'
        ? { type: 'bool', value: word === 'true' }
        : null
    }
    case 'int':
    case 'float':
    case 'double': {
      const n = Number(text.trim())
      return text.trim() !== '' && Number.isFinite(n)
        ? { type: 'number', value: n }
        : null
    }
    case 'token': {
      const n = Number(text.trim())
      return Number.isInteger(n) ? { type: 'token', value: n } : null
    }
    case 'UDim': {
      const v = numbers(tag, ['S', 'O'] as const)
      return v && { type: 'UDim', s: v.S, o: v.O }
    }
    case 'UDim2': {
      const v = numbers(tag, ['XS', 'XO', 'YS', 'YO'] as const)
      return v && { type: 'UDim2', xs: v.XS, xo: v.XO, ys: v.YS, yo: v.YO }
    }
    case 'Vector2': {
      const v = numbers(tag, ['X', 'Y'] as const)
      return v && { type: 'Vector2', x: v.X, y: v.Y }
    }
    case 'Rect2D': {
      const min = childNamed(tag, 'min')
      const max = childNamed(tag, 'max')
      const a = min && numbers(min, ['X', 'Y'] as const)
      const b = max && numbers(max, ['X', 'Y'] as const)
      return a && b
        ? { type: 'Rect', minX: a.X, minY: a.Y, maxX: b.X, maxY: b.Y }
        : null
    }
    case 'Color3': {
      // Usually <R><G><B> from 0 to 1; some older files pack it in one number.
      if (!childNamed(tag, 'R')) return unpackColor(Number(text.trim()))
      const v = numbers(tag, ['R', 'G', 'B'] as const)
      return v && { type: 'Color3', r: v.R, g: v.G, b: v.B }
    }
    case 'Color3uint8':
      return unpackColor(Number(text.trim()))
    case 'Content': {
      // <uri> (newer files) or <url> (older ones); <null> for no image.
      const link = childNamed(tag, 'uri') ?? childNamed(tag, 'url')
      return { type: 'Content', value: link ? textOf(link).trim() : '' }
    }
    case 'Font': {
      const family = childNamed(tag, 'Family')
      const url = family && childNamed(family, 'url')
      const weight = numberIn(childNamed(tag, 'Weight'))
      const style = childNamed(tag, 'Style')
      if (!url || !Number.isInteger(weight)) return null
      return {
        type: 'Font',
        family: textOf(url).trim(),
        weight,
        style: style ? textOf(style).trim() : 'Normal',
      }
    }
    case 'ColorSequence': {
      // "time R G B envelope" per keypoint (see export/rbxmx.ts).
      const keypoints = groups(text, 5)
      return (
        keypoints && {
          type: 'ColorSequence',
          value: keypoints.map(([time, r, g, b]) => ({
            time,
            color: { r, g, b },
          })),
        }
      )
    }
    case 'NumberSequence': {
      // "time value envelope" per keypoint.
      const keypoints = groups(text, 3)
      return (
        keypoints && {
          type: 'NumberSequence',
          value: keypoints.map(([time, value]) => ({ time, value })),
        }
      )
    }
    default:
      return undefined // a type Udimo has no use for
  }
}

function readItem(item: XmlElement): RawInstance {
  const properties = new Map<string, RawValue>()
  const unreadable: string[] = []
  const tags = childNamed(item, 'Properties')
  for (const tag of tags ? elementsOf(tags) : []) {
    const name = tag.attributes.name
    if (!name) continue
    const value = readValue(tag)
    if (value === null) unreadable.push(name)
    else if (value !== undefined) properties.set(name, value)
  }
  return {
    className: item.attributes.class ?? '',
    properties,
    unreadable,
    children: elementsOf(item)
      .filter((child) => child.name === 'Item')
      .map(readItem),
  }
}

// The instances at the top of an .rbxmx file, each with everything inside
// it. Throws RbxmxError for a file that isn't one.
export function readRbxmx(text: string): RawInstance[] {
  // Studio's other model format, binary .rbxm, starts like this. It's not
  // text at all, so say how to get the XML version instead.
  if (text.startsWith('<roblox!')) {
    throw new RbxmxError(
      'This is a binary model (.rbxm). In Studio, right-click the ScreenGui, choose Save to File…, and pick “Model Files (*.rbxmx)”.',
    )
  }
  let root: XmlElement
  try {
    root = parseXml(text)
  } catch (error) {
    throw new RbxmxError(
      `This isn’t a readable .rbxmx file: ${(error as Error).message}.`,
    )
  }
  if (root.name !== 'roblox') {
    throw new RbxmxError('This isn’t a Roblox model file (.rbxmx).')
  }
  return elementsOf(root)
    .filter((child) => child.name === 'Item')
    .map(readItem)
}
