import type { CSSProperties } from 'react'
import { udimToCss } from '../../lib/udim2.ts'
import type { Props, Rect } from '../../model/types.ts'

// How a preview picture is drawn on the canvas for each ScaleType, as CSS
// for a box covering the element. `url` is the picture (already tinted by
// ImageColor3), `width` and `height` its own size in pixels.

// Slice: how far in from each edge of the picture the stretchy middle
// (SliceCenter) starts, in the picture's pixels. Never negative.
export function sliceInsets(
  center: Rect,
  width: number,
  height: number,
): { top: number; right: number; bottom: number; left: number } {
  const clamp = (value: number, max: number) =>
    Math.min(Math.max(0, value), max)
  return {
    top: clamp(center.minY, height),
    left: clamp(center.minX, width),
    right: clamp(width - center.maxX, width),
    bottom: clamp(height - center.maxY, height),
  }
}

export function imageLayerStyle(
  p: Required<Props>,
  url: string,
  width: number,
  height: number,
): CSSProperties {
  const image = `url("${url}")`
  switch (p.ScaleType) {
    case 'Stretch':
      return {
        backgroundImage: image,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
      }
    case 'Fit': // the whole picture, keeping its shape, centered
      return {
        backgroundImage: image,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    case 'Crop': // covers the element, keeping its shape, centered
      return {
        backgroundImage: image,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    case 'Tile': {
      // Each copy is TileSize big (Scale of the element), from the top-left.
      const { xs, xo, ys, yo } = p.TileSize
      return {
        backgroundImage: image,
        backgroundSize: `${udimToCss(xs, xo)} ${udimToCss(ys, yo)}`,
        backgroundPosition: '0 0',
        backgroundRepeat: 'repeat',
      }
    }
    case 'Slice': {
      // CSS's own 9-slice: border-image. The corners and edges keep their
      // size (times SliceScale); the middle stretches ("fill" draws it).
      const { top, right, bottom, left } = sliceInsets(
        p.SliceCenter,
        width,
        height,
      )
      const s = p.SliceScale
      return {
        borderStyle: 'solid',
        borderWidth: 0,
        borderImageSource: image,
        borderImageSlice: `${top} ${right} ${bottom} ${left} fill`,
        borderImageWidth: `${top * s}px ${right * s}px ${bottom * s}px ${left * s}px`,
        borderImageRepeat: 'stretch',
      }
    }
  }
}
