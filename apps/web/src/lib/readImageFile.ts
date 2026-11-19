import {
  ACCEPTED_IMAGE_TYPES,
  fitWithin,
  isSafeImageDataUrl,
} from '../model/previewImages.ts'
import type { PreviewImage } from '../model/types.ts'

// Turns an image file from your computer into a preview picture (see
// UiNode.previewImage): decoded by the browser, shrunk to fit 1024 px if
// bigger (Roblox's limit), and written out as a data URL to keep in the
// project. Its key is a fingerprint of the picture (a SHA-256 hash), so the
// same file picked twice is stored once.

export class ImageFileError extends Error {}

// Bigger than this is almost certainly not a UI image.
const MAX_FILE_BYTES = 20 * 1024 * 1024

export async function readImageFile(
  file: File,
): Promise<{ key: string; image: PreviewImage }> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new ImageFileError(
      `“${file.name}” isn’t a PNG, JPG or BMP: the image types Roblox accepts.`,
    )
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ImageFileError(`“${file.name}” is too big (over 20 MB).`)
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new ImageFileError(`“${file.name}” couldn’t be opened as an image.`)
  }
  const size = fitWithin(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, size.width, size.height)
  bitmap.close()

  // WebP keeps transparency and is much smaller than PNG; browsers that
  // can't write WebP (Safari) hand back a PNG instead.
  const dataUrl = canvas.toDataURL('image/webp', 0.9)
  if (!isSafeImageDataUrl(dataUrl)) {
    throw new ImageFileError(`“${file.name}” couldn’t be converted.`)
  }

  const bytes = new TextEncoder().encode(dataUrl)
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  const key = [...hash.slice(0, 12)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return { key, image: { name: file.name, dataUrl, ...size } }
}
