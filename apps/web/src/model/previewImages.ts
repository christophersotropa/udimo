import type { PreviewImage, UiDocument, UiNode } from './types.ts'

// Preview pictures: images picked from your computer to show on the canvas
// (see UiNode.previewImage). Plain TypeScript, no React; reading a file
// needs the browser and lives in lib/readImageFile.ts.

// The file types Roblox accepts for image uploads that a browser can also
// show (Roblox's other one, TGA, can't be previewed).
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/bmp']

// Roblox shrinks uploaded images to fit 1024 × 1024, so a bigger preview
// would only waste space.
export const MAX_IMAGE_SIZE = 1024

// A size shrunk (never grown) to fit within `max` on its longest side,
// keeping its shape, in whole pixels.
export function fitWithin(
  width: number,
  height: number,
  max = MAX_IMAGE_SIZE,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

// Only pictures written out inside the project itself are allowed, never
// links: a shared project file can't make your browser load anything from
// elsewhere.
export function isSafeImageDataUrl(value: string): boolean {
  return /^data:image\/(png|jpeg|webp|bmp);base64,[A-Za-z0-9+/]+=*$/.test(value)
}

// The picture an element previews, if it has one.
export function previewOf(
  doc: UiDocument,
  node: UiNode,
): PreviewImage | undefined {
  return node.previewImage ? doc.images?.[node.previewImage] : undefined
}

// The pictures some elements use, by key.
export function imagesUsedBy(
  doc: UiDocument,
  nodes: Iterable<UiNode>,
): Record<string, PreviewImage> {
  const used: Record<string, PreviewImage> = {}
  for (const node of nodes) {
    const image = previewOf(doc, node)
    if (image) used[node.previewImage!] = image
  }
  return used
}

// The document with only the pictures still in use, for saving. (Deleted
// elements' pictures stay in memory until then, so undo can bring them
// back.)
export function withUsedImagesOnly(doc: UiDocument): UiDocument {
  const { images: _all, ...rest } = doc
  const used = imagesUsedBy(doc, Object.values(doc.nodes))
  return Object.keys(used).length > 0 ? { ...rest, images: used } : rest
}
