import type { NodeId, UiDocument } from '../model/types.ts'
import { luauString } from './luauString.ts'

// The optional "button stubs" LocalScript: one empty handler for every
// button, so scripting a new UI starts with the wiring already done.
// It's a LocalScript because button presses happen on the player's device.

export const BUTTON_SCRIPT_NAME = 'ButtonHandlers'

// Words Luau keeps for itself, which can't be variable names.
const LUAU_KEYWORDS = new Set([
  'and',
  'break',
  'continue',
  'do',
  'else',
  'elseif',
  'end',
  'export',
  'false',
  'for',
  'function',
  'if',
  'in',
  'local',
  'nil',
  'not',
  'or',
  'repeat',
  'return',
  'then',
  'true',
  'type',
  'until',
  'while',
])

// A variable name for an element: its name in camelCase, letters and
// digits only ("Buy Button" and "BuyButton" both give buyButton). Made
// unique against `used` by adding a number, and kept clear of keywords
// and the names the script itself uses. A name with no letters, or one
// starting with a digit, gets `fallback` in front ("2" gives button2).
export function luauIdentifier(
  name: string,
  used: Set<string>,
  fallback = 'button',
): string {
  const words = name.match(/[A-Za-z0-9]+/g) ?? []
  let id = words
    .map((word, i) =>
      i === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join('')
  if (id === '' || /^[0-9]/.test(id)) id = `${fallback}${id}`
  if (LUAU_KEYWORDS.has(id)) {
    id = `${id}${fallback.charAt(0).toUpperCase()}${fallback.slice(1)}`
  }
  let unique = id
  for (let n = 2; used.has(unique); n++) unique = `${id}${n}`
  used.add(unique)
  return unique
}

// How a script in the ScreenGui reaches an element: a WaitForChild for
// each name from the ScreenGui down (`gui` being script.Parent), so it
// waits for anything not loaded yet. `ambiguous` if a name along the way
// is shared by siblings: WaitForChild finds the first, which may be the
// wrong one.
export function elementPath(
  doc: UiDocument,
  id: NodeId,
): { path: string; ambiguous: boolean } {
  const chain: NodeId[] = []
  for (let at: NodeId | null = id; at !== doc.rootId && at !== null;) {
    chain.unshift(at)
    at = doc.nodes[at].parentId
  }
  const ambiguous = chain.some((step) => {
    const { name, parentId } = doc.nodes[step]
    return (
      doc.nodes[parentId!].children.filter(
        (sibling) => doc.nodes[sibling].name === name,
      ).length > 1
    )
  })
  const path = chain
    .map((step) => `:WaitForChild(${luauString(doc.nodes[step].name)})`)
    .join('')
  return { path: `gui${path}`, ambiguous }
}

// The comment above an elementPath that's ambiguous.
export const AMBIGUOUS_NOTE = [
  '-- Note: more than one element along this path shares a name, so',
  '-- WaitForChild finds the first one. Give them different names.',
]

// Every TextButton and ImageButton, top to bottom.
function buttons(doc: UiDocument): NodeId[] {
  const found: NodeId[] = []
  const visit = (id: NodeId) => {
    for (const childId of doc.nodes[id].children) {
      const { className } = doc.nodes[childId]
      if (className === 'TextButton' || className === 'ImageButton') {
        found.push(childId)
      }
      visit(childId)
    }
  }
  visit(doc.rootId)
  return found
}

// The script's Luau source, or null when there are no buttons.
export function buttonScriptSource(doc: UiDocument): string | null {
  const ids = buttons(doc)
  if (ids.length === 0) return null

  const used = new Set(['gui', 'script', 'game'])
  const lines = [
    '-- Made with Udimo: an empty handler for every button in this ScreenGui.',
    '-- Fill in what each one should do.',
    '',
    'local gui = script.Parent',
  ]
  for (const id of ids) {
    const { path, ambiguous } = elementPath(doc, id)
    const name = doc.nodes[id].name
    const variable = luauIdentifier(name, used)
    lines.push('')
    if (ambiguous) lines.push(...AMBIGUOUS_NOTE)
    lines.push(
      `local ${variable} = ${path}`,
      `${variable}.Activated:Connect(function()`,
      `\t-- TODO: what happens when ${name.replace(/\n/g, ' ')} is pressed`,
      'end)',
    )
  }
  return lines.join('\n') + '\n'
}
