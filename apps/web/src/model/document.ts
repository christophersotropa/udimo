import type { UiDocument } from './types.ts'

// A new, empty document: just a ScreenGui with no children.
// This is what the editor opens with.
export function createEmptyDocument(): UiDocument {
  const rootId = 'root'

  return {
    rootId,
    nodes: {
      [rootId]: {
        id: rootId,
        className: 'ScreenGui',
        name: 'ScreenGui',
        parentId: null,
        children: [],
        props: {},
      },
    },
  }
}
