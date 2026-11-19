import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import {
  fitWithin,
  imagesUsedBy,
  isSafeImageDataUrl,
  withUsedImagesOnly,
} from './previewImages.ts'
import { PICTURE } from './testPictures.ts'

describe('fitWithin', () => {
  it('shrinks a big picture to fit, keeping its shape', () => {
    expect(fitWithin(2048, 1024)).toEqual({ width: 1024, height: 512 })
    expect(fitWithin(300, 1500, 1024)).toEqual({ width: 205, height: 1024 })
  })

  it('never grows a small one', () => {
    expect(fitWithin(64, 32)).toEqual({ width: 64, height: 32 })
  })
})

describe('isSafeImageDataUrl', () => {
  it('accepts pictures written out in the file', () => {
    expect(isSafeImageDataUrl(PICTURE.dataUrl)).toBe(true)
    expect(isSafeImageDataUrl('data:image/webp;base64,UklGRg==')).toBe(true)
  })

  it('refuses links and anything that could run code', () => {
    for (const value of [
      'https://example.com/pet.png',
      'javascript:alert(1)',
      'data:image/svg+xml;base64,PHN2Zz4=', // SVG can hold scripts
      'data:text/html;base64,PGgxPg==',
      'data:image/png;base64,abc"><script>',
    ]) {
      expect(isSafeImageDataUrl(value)).toBe(false)
    }
  })
})

describe('preview pictures in a document', () => {
  function setup() {
    const store = createDocumentStore()
    const { addNode, setPreviewImage } = store.getState()
    const root = store.getState().document.rootId
    const a = addNode(root, 'ImageLabel')
    const b = addNode(root, 'ImageLabel')
    setPreviewImage(a, { key: 'pet', image: PICTURE })
    setPreviewImage(b, { key: 'pet', image: { ...PICTURE, name: 'again.png' } })
    return { store, a, b }
  }

  it('stores one picture used twice only once', () => {
    const { store, a, b } = setup()
    const doc = store.getState().document
    expect(Object.keys(doc.images!)).toEqual(['pet'])
    expect(doc.images!.pet.name).toBe('pet.png') // the first one is kept
    expect(doc.nodes[a].previewImage).toBe('pet')
    expect(doc.nodes[b].previewImage).toBe('pet')
  })

  it('removes a preview, and undo brings it back', () => {
    const { store, a } = setup()
    store.getState().setPreviewImage(a, null)
    expect(store.getState().document.nodes[a].previewImage).toBeUndefined()
    store.getState().undo()
    expect(store.getState().document.nodes[a].previewImage).toBe('pet')
  })

  it('saves only the pictures still in use', () => {
    const { store, a, b } = setup()
    const { setPreviewImage } = store.getState()
    setPreviewImage(a, { key: 'other', image: PICTURE })
    setPreviewImage(a, null)
    setPreviewImage(b, null)
    const doc = store.getState().document
    expect(Object.keys(doc.images!)).toEqual(['pet', 'other']) // in memory
    expect(withUsedImagesOnly(doc).images).toBeUndefined()
    setPreviewImage(b, { key: 'pet', image: PICTURE })
    const saved = withUsedImagesOnly(store.getState().document)
    expect(Object.keys(saved.images!)).toEqual(['pet'])
    expect(imagesUsedBy(doc, [doc.nodes[a]])).toEqual({})
  })
})
