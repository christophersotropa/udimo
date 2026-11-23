// The search behind the command field (CommandBar.tsx): which commands
// match what was typed, best first. Plain TypeScript, no React, so it's
// tested on its own (commandSearch.test.ts).

// Anything the field can run. `keywords` are extra words that should find
// it ("button" for TextButton is already in its name; "corner" for
// UICorner is too, since names are split into words).
export type Command = {
  id: string
  label: string
  keywords?: string
}

// The words in a name: split at spaces and at capital letters, so
// "TextButton" is "text button" and "UICorner" is "ui corner".
export function wordsOf(text: string): string[] {
  return (
    text.match(/[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+|\d+/g) ?? []
  ).map((word) => word.toLowerCase())
}

// How well one command matches the typed words, lower is better, or null
// when it doesn't match. Every typed word must appear somewhere (in the
// name or the keywords); the first typed word decides the rank:
//   0  the name starts with it ("text" → TextLabel)
//   1  a word in the name starts with it ("but" → TextButton)
//   2  it's somewhere in the name ("orne" → UICorner)
//   3  only the keywords have it
function score(command: Command, terms: string[]): number | null {
  const name = command.label.toLowerCase()
  const everything = `${name} ${command.keywords?.toLowerCase() ?? ''}`
  if (!terms.every((term) => everything.includes(term))) return null
  const [first] = terms
  if (name.startsWith(first)) return 0
  if (wordsOf(command.label).some((word) => word.startsWith(first))) return 1
  if (name.includes(first)) return 2
  return 3
}

// The commands matching `query`, best first; ties keep their list order
// (so the Insert list keeps its usual order). An empty query matches
// everything, in list order.
export function searchCommands<T extends Command>(
  commands: readonly T[],
  query: string,
): T[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return [...commands]
  return commands
    .map((command, index) => ({ command, index, rank: score(command, terms) }))
    .filter((hit) => hit.rank !== null)
    .sort((a, b) => a.rank! - b.rank! || a.index - b.index)
    .map((hit) => hit.command)
}
