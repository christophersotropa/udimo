import type { Color3 } from '../model/types.ts'

// ImageColor3: Roblox multiplies every pixel of an image by this colour
// (white leaves it alone, black makes it a silhouette). CSS can't do that
// to a picture, so a tinted copy is drawn once on an off-screen <canvas>
// (browsers only) and kept for reuse.

// The last few tinted copies, by `cacheKey` and colour.
const cache = new Map<string, Promise<string>>()
const CACHE_SIZE = 40

export function isWhite(color: Color3): boolean {
  return color.r === 1 && color.g === 1 && color.b === 1
}

// `dataUrl` multiplied by `color`, as a new data URL. `cacheKey` names the
// picture (its key in the document), so it needn't be compared byte by byte.
export function tintImage(
  dataUrl: string,
  color: Color3,
  cacheKey: string,
): Promise<string> {
  const key = `${cacheKey}:${color.r},${color.g},${color.b}`
  const cached = cache.get(key)
  if (cached) return cached

  const result = new Promise<string>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const g = canvas.getContext('2d')!
      g.drawImage(image, 0, 0)
      // Multiply the colours...
      g.globalCompositeOperation = 'multiply'
      g.fillStyle = `rgb(${color.r * 255} ${color.g * 255} ${color.b * 255})`
      g.fillRect(0, 0, canvas.width, canvas.height)
      // ...then keep the picture's own see-through parts.
      g.globalCompositeOperation = 'destination-in'
      g.drawImage(image, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => reject(new Error('The picture could not be tinted.'))
    image.src = dataUrl
  })
  cache.set(key, result)
  // Forget the oldest copies (a Map keeps the order things were added).
  while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!)
  return result
}
