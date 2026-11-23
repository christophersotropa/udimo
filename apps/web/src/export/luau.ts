import type { Color3, UiDocument } from '../model/types.ts'
import { luauString } from './luauString.ts'
import {
  type ExportInstance,
  exportTree,
  type Property,
  type Value,
} from './instances.ts'

// Writes a document as a Luau script for Roblox Studio's Command Bar. Pasted
// in and run, it builds the ScreenGui in StarterGui with Instance.new and
// selects it. Which properties each instance gets is decided in
// instances.ts, the same list the .rbxmx file uses; this file only knows
// how to write them as Luau.

// Numbers as Luau understands them. JavaScript's own formatting (like 0.5,
// -24, 1e-7) is valid Luau too.
// A number in Luau. Infinity (UISizeConstraint's MaxSize with no limit) is
// math.huge, Luau's name for it.
const num = (n: number) =>
  n === Infinity ? 'math.huge' : n === -Infinity ? '-math.huge' : String(n)

// A color. Colors picked in Udimo are whole steps of 1/255, so they're
// written the way Roblox developers usually write them, Color3.fromRGB(20,
// 20, 30). Anything else (from a gradient, say) uses Color3.new with 0..1.
function luauColor(c: Color3): string {
  const channels = [c.r, c.g, c.b].map((channel) => channel * 255)
  if (channels.every((v) => Math.abs(v - Math.round(v)) < 1e-6)) {
    return `Color3.fromRGB(${channels.map((v) => Math.round(v)).join(', ')})`
  }
  return `Color3.new(${num(c.r)}, ${num(c.g)}, ${num(c.b)})`
}

// One property value as a Luau expression.
function luauValue(value: Value): string {
  switch (value.type) {
    case 'string':
    case 'Content':
    case 'source':
      return luauString(value.value)
    case 'bool':
      return String(value.value)
    case 'int':
    case 'float':
      return num(value.value)
    case 'enum':
      // In a script, enums are written by name: Enum.FillDirection.Vertical.
      return `Enum.${value.enumName}.${value.item}`
    case 'UDim':
      return `UDim.new(${num(value.value.s)}, ${num(value.value.o)})`
    case 'UDim2': {
      const v = value.value
      return `UDim2.new(${num(v.xs)}, ${num(v.xo)}, ${num(v.ys)}, ${num(v.yo)})`
    }
    case 'Vector2':
      return `Vector2.new(${num(value.value.x)}, ${num(value.value.y)})`
    case 'Rect': {
      const r = value.value
      return `Rect.new(${num(r.minX)}, ${num(r.minY)}, ${num(r.maxX)}, ${num(r.maxY)})`
    }
    case 'Color3':
      return luauColor(value.value)
    case 'Font':
      return `Font.new(${luauString(value.family)}, Enum.FontWeight.${value.weight}, Enum.FontStyle.${value.style})`
    case 'ColorSequence':
      return `ColorSequence.new({ ${value.value
        .map(
          ({ time, color }) =>
            `ColorSequenceKeypoint.new(${num(time)}, ${luauColor(color)})`,
        )
        .join(', ')} })`
    case 'NumberSequence':
      return `NumberSequence.new({ ${value.value
        .map(
          ({ time, value: v }) =>
            `NumberSequenceKeypoint.new(${num(time)}, ${num(v)})`,
        )
        .join(', ')} })`
  }
}

// The table of properties passed to make(), one per line.
function propertyTable(properties: Property[]): string[] {
  return properties
    .filter((property) => property.only !== 'rbxmx')
    .map((property) => `\t${property.name} = ${luauValue(property.value)},`)
}

export function documentToLuau(
  doc: UiDocument,
  options: { resetOnSpawn?: boolean; buttonScript?: boolean } = {},
): string {
  const tree = exportTree(doc, options)
  const name = doc.nodes[doc.rootId].name
  const lines = [
    '-- Made with Udimo.',
    "-- Paste this into Roblox Studio's Command Bar (View > Command Bar) and press Enter.",
    `-- It adds the ScreenGui ${luauString(name)} to StarterGui and selects it.`,
    '',
    '-- Makes one instance: sets its properties, then its parent last, so',
    '-- Roblox only draws it once it is fully set up.',
    'local function make(className, parent, properties)',
    '\tlocal instance = Instance.new(className)',
    '\tfor property, value in pairs(properties) do',
    '\t\tinstance[property] = value',
    '\tend',
    '\tinstance.Parent = parent',
    '\treturn instance',
    'end',
    '',
    // A table instead of one local variable per instance: Luau allows at
    // most 200 local variables in a script, and big UIs have more parts.
    '-- The instances other instances go inside, by number.',
    'local made = {}',
    '',
  ]

  let count = 0
  // Writes one make() call, then the calls for its children. Only
  // instances that have children are kept in `made`, to parent them.
  function write(instance: ExportInstance, parent: string) {
    const call = `make(${luauString(instance.className)}, ${parent}, {`
    let ref: string | null = null
    if (instance.children.length > 0 || parent.startsWith('game:')) {
      ref = `made[${++count}]`
      lines.push(`${ref} = ${call}`)
    } else {
      lines.push(call)
    }
    lines.push(...propertyTable(instance.properties), '})')
    for (const child of instance.children) write(child, ref!)
  }

  write(tree, 'game:GetService("StarterGui")')
  lines.push(
    '',
    'game:GetService("Selection"):Set({ made[1] })',
    `print(${luauString(`Udimo: added ${name} to StarterGui`)})`,
  )
  return lines.join('\n') + '\n'
}

export { luauString }
