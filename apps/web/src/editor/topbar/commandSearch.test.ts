import { describe, expect, it } from 'vitest'
import { type Command, searchCommands, wordsOf } from './commandSearch.ts'

const commands: Command[] = [
  { id: 'Frame', label: 'Frame' },
  { id: 'TextLabel', label: 'TextLabel' },
  { id: 'TextButton', label: 'TextButton' },
  { id: 'ImageButton', label: 'ImageButton' },
  { id: 'UICorner', label: 'UICorner', keywords: 'rounded' },
  { id: 'fit', label: 'Zoom to Fit' },
  { id: 'dup', label: 'Duplicate' },
  { id: 'group', label: 'Group as Frame' },
]
const ids = (query: string) => searchCommands(commands, query).map((c) => c.id)

describe('wordsOf', () => {
  it('splits names at spaces and capitals', () => {
    expect(wordsOf('TextButton')).toEqual(['text', 'button'])
    expect(wordsOf('UICorner')).toEqual(['ui', 'corner'])
    expect(wordsOf('Zoom to 100%')).toEqual(['zoom', 'to', '100'])
  })
})

describe('searchCommands', () => {
  it('lists everything, in order, for an empty search', () => {
    expect(ids('')).toEqual(commands.map((c) => c.id))
    expect(ids('   ')).toEqual(commands.map((c) => c.id))
  })

  it('finds a class by any word of its name', () => {
    expect(ids('but')).toEqual(['TextButton', 'ImageButton'])
    expect(ids('corner')).toEqual(['UICorner'])
  })

  it('ranks names that start with the search first', () => {
    // "Frame" starts with it; "Group as Frame" only has it as a later word.
    expect(ids('fra')).toEqual(['Frame', 'group'])
  })

  it('ignores capitals', () => {
    expect(ids('TEXTB')).toEqual(['TextButton'])
  })

  it('needs every typed word, in any order', () => {
    expect(ids('zoom fit')).toEqual(['fit'])
    expect(ids('fit zoom')).toEqual(['fit'])
    expect(ids('zoom frame')).toEqual([])
  })

  it('finds by keywords, ranked after name matches', () => {
    expect(ids('round')).toEqual(['UICorner'])
  })

  it('finds text inside a word, below word matches', () => {
    expect(ids('orne')).toEqual(['UICorner'])
  })

  it('returns nothing when nothing matches', () => {
    expect(ids('xyz')).toEqual([])
  })
})
