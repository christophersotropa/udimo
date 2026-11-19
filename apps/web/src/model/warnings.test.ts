import { describe, expect, it } from 'vitest'
import {
  createDocumentStore,
  type ElementClassName,
} from '../store/documentStore.ts'
import type { Props } from './types.ts'
import { exportWarnings, type MeasureText } from './warnings.ts'

// A document with one element in it, positioned well inside every screen
// and away from the top bar, unless `props` says otherwise.
function setup(className: ElementClassName = 'Frame', props: Props = {}) {
  const store = createDocumentStore()
  const root = store.getState().document.rootId
  const id = store.getState().addNode(root, className, {
    Position: { xs: 0, xo: 100, ys: 0, yo: 100 },
    ...props,
  })
  return {
    store,
    root,
    id,
    warnings: () => exportWarnings(store.getState().document),
  }
}

const messages = (list: { message: string }[]) => list.map((w) => w.message)

describe('exportWarnings', () => {
  it('notes an empty ScreenGui', () => {
    const store = createDocumentStore()
    expect(messages(exportWarnings(store.getState().document))).toEqual([
      'Nothing to export yet: the ScreenGui is empty',
    ])
  })

  it('has nothing to say about a plain, well-placed Frame', () => {
    expect(setup().warnings()).toEqual([])
  })

  describe('images', () => {
    it("warns about Studio's placeholder, no image, or a bad ID", () => {
      expect(messages(setup('ImageLabel').warnings())[0]).toContain(
        'placeholder',
      )
      expect(
        messages(setup('ImageLabel', { Image: '' }).warnings())[0],
      ).toContain('no asset ID')
      expect(
        messages(
          setup('ImageLabel', { Image: 'my-picture.png' }).warnings(),
        )[0],
      ).toContain('doesn’t look like a Roblox image ID')
    })

    it('is happy with an asset ID or a Roblox link', () => {
      expect(setup('ImageLabel', { Image: '123456' }).warnings()).toEqual([])
      expect(
        setup('ImageLabel', {
          Image: 'https://create.roblox.com/store/asset/99/Icon',
        }).warnings(),
      ).toEqual([])
    })
  })

  describe('text that does not fit', () => {
    // Pretend every character is exactly 10px wide, whatever the size.
    const tenPerChar: MeasureText = (text) => text.length * 10

    it('names the devices where it overflows', () => {
      // 10% of the screen wide: 192px on desktop, 102px on tablet, 84px on phone.
      const { store } = setup('TextLabel', {
        Size: { xs: 0.1, xo: 0, ys: 0, yo: 50 },
        Text: 'fifteen letters', // 150px
      })
      const [warning] = exportWarnings(store.getState().document, tenPerChar)
      expect(warning.message).toBe(
        'May overflow on tablet and phone at TextSize 14',
      )
      expect(warning.path).toBe('TextLabel')
      expect(warning.level).toBe('warning')
      expect(warning.devices).toEqual(['tablet', 'phone']) // to preview there
    })

    it('counts lines against the height', () => {
      const { store } = setup('TextLabel', {
        Size: { xs: 0, xo: 400, ys: 0, yo: 30 },
        Text: 'one\ntwo', // two lines of TextSize 20 = 40px tall
        TextSize: 20,
      })
      expect(
        exportWarnings(store.getState().document, tenPerChar),
      ).toHaveLength(1)
    })

    it('trusts TextScaled to fit', () => {
      const { store } = setup('TextLabel', {
        Size: { xs: 0, xo: 20, ys: 0, yo: 20 },
        Text: 'far too long for this box',
        TextScaled: true,
      })
      expect(exportWarnings(store.getState().document, tenPerChar)).toEqual([])
    })
  })

  describe('elements off the screen', () => {
    it('names the devices where an element goes past the edge', () => {
      // 1000 to 1200px from the left: fine on desktop (1920), not on smaller screens.
      const { warnings } = setup('Frame', {
        Position: { xs: 0, xo: 1000, ys: 0, yo: 100 },
        Size: { xs: 0, xo: 200, ys: 0, yo: 100 },
      })
      expect(messages(warnings())).toEqual([
        'Goes off-screen on tablet and phone',
      ])
    })

    it('only reports the outermost element, and not ScrollingFrame contents', () => {
      const { store, id } = setup('Frame', {
        Position: { xs: 0, xo: 1000, ys: 0, yo: 100 },
        Size: { xs: 0, xo: 200, ys: 0, yo: 100 },
      })
      store.getState().addNode(id, 'Frame') // moves with its parent
      const scroller = store
        .getState()
        .addNode(store.getState().document.rootId, 'ScrollingFrame', {
          Position: { xs: 0, xo: 100, ys: 0, yo: 100 },
        })
      store.getState().renameNode(scroller, 'List')
      store.getState().addNode(scroller, 'Frame', {
        Position: { xs: 0, xo: 0, ys: 0, yo: 5000 }, // far down, but it scrolls
      })
      const offScreen = exportWarnings(store.getState().document).filter((w) =>
        w.key.startsWith('offscreen:'),
      )
      expect(offScreen.map((w) => w.nodeId)).toEqual([id])
    })
  })

  describe("Roblox's top bar", () => {
    it('notes top-level elements in the top strip', () => {
      const [note] = setup('Frame', {
        Position: { xs: 0, xo: 24, ys: 0, yo: 24 },
      }).warnings()
      expect(note.level).toBe('info')
      expect(note.message).toContain('In the top 58 px')
      expect(note.path).toBe('Frame')
    })

    it('ignores hidden elements', () => {
      const { warnings } = setup('Frame', {
        Position: { xs: 0, xo: 24, ys: 0, yo: 24 },
        Visible: false,
      })
      expect(warnings()).toEqual([])
    })
  })

  it('merges identical warnings into one, with a count', () => {
    const { store, root } = setup('ImageLabel')
    store.getState().addNode(root, 'ImageLabel', {
      Position: { xs: 0, xo: 300, ys: 0, yo: 100 },
    })
    const placeholder = exportWarnings(store.getState().document).filter((w) =>
      w.key.startsWith('image:'),
    )
    expect(placeholder).toHaveLength(1)
    expect(placeholder[0].message).toMatch(/\(×2\)$/)
  })

  describe('duplicate names', () => {
    it('notes siblings that share a name', () => {
      const { store, root } = setup('Frame')
      store.getState().addNode(root, 'Frame', {
        Position: { xs: 0, xo: 300, ys: 0, yo: 100 },
      })
      expect(messages(exportWarnings(store.getState().document))).toEqual([
        '2 children called “Frame”; scripts can’t tell them apart',
      ])
    })
  })
})

describe('a previewed picture', () => {
  it('says which file still needs uploading', () => {
    const { store, id, warnings } = setup('ImageLabel')
    store.getState().setPreviewImage(id, {
      key: 'pet',
      image: {
        name: 'pet.png',
        dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
        width: 64,
        height: 32,
      },
    })
    expect(warnings().map((w) => w.message)).toContain(
      'Previews “pet.png”, which isn’t on Roblox yet; upload it and paste its asset ID',
    )
    // With an asset ID pasted, it's ready.
    store.getState().updateProps(id, { Image: 'rbxassetid://123' })
    expect(warnings().some((w) => w.message.includes('pet.png'))).toBe(false)
  })
})

describe('pathOf', () => {
  it('names an element the way a script reaches it', () => {
    const store = createDocumentStore()
    const { addNode, renameNode } = store.getState()
    const rootId = store.getState().document.rootId
    const items = addNode(rootId, 'Frame')
    renameNode(items, 'Items')
    const card = addNode(items, 'Frame')
    renameNode(card, 'PotionCard')
    const icon = addNode(card, 'ImageLabel')
    renameNode(icon, 'Icon')
    const [warning] = exportWarnings(store.getState().document).filter((w) =>
      w.key.startsWith('image:'),
    )
    expect(warning.path).toBe('Items.PotionCard.Icon')
  })
})
