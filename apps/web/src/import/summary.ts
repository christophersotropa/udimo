import type { ImportResult, SkippedInstance } from './toDocument.ts'

// What an import did, as short sentences for the editor to show: a title,
// a one-line count, and lists of what was left out and why. Plain
// TypeScript, so the wording is tested on its own (summary.test.ts).

export type ImportSummary = {
  title: string // "Opened Shop" / "Added Card and Buy"
  summary: string // "8 instances came in. 1 was left out."
  skipped: string[] // one line per instance left out
  notes: string[] // one line per value that didn't fit
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// "LocalScript “Handler” in Shop.Window, and 2 inside it"
export function skippedLine(item: SkippedInstance): string {
  const where = item.path ? ` in ${item.path}` : ''
  const inside = item.inside > 0 ? `, and ${item.inside} inside it` : ''
  return `${item.className} “${item.name}”${where}${inside}`
}

// "Card", "Card and Buy", "Card, Buy and 3 more"
function listOf(names: string[]): string {
  if (names.length <= 2) return names.join(' and ')
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`
}

// `addedNames`: when the file's elements were added to the current design
// (result.wrapped), their names; otherwise the file opened as the design.
export function summarize(
  result: ImportResult,
  addedNames: string[] = [],
): ImportSummary {
  const root = result.document.nodes[result.document.rootId]
  const leftOut = result.skipped.reduce((n, s) => n + 1 + s.inside, 0)
  return {
    title: result.wrapped
      ? `Added ${listOf(addedNames)}`
      : `Opened ${root.name}`,
    summary:
      // The new ScreenGui made to hold added elements isn't counted.
      `${plural(result.imported - (result.wrapped ? 1 : 0), 'instance')} came in.` +
      (leftOut > 0
        ? ` ${leftOut} ${leftOut === 1 ? 'was' : 'were'} left out.`
        : ''),
    skipped: result.skipped.map(skippedLine),
    notes: result.notes,
  }
}
