import { describe, expect, it } from 'vitest'
import { resolveProps } from '../../model/defaults.ts'
import type { Props } from '../../model/types.ts'
import { imageLayerStyle, sliceInsets } from './imageStyle.ts'

// An ImageLabel's resolved props, with some changed.
const propsWith = (props: Props) =>
  resolveProps({
    id: 'a',
    className: 'ImageLabel',
    name: 'Image',
    parentId: 'root',
    children: [],
    props,
  })

describe('sliceInsets', () => {
  it('measures each edge in from the picture’s sides', () => {
    // A 64 × 64 button with a 10 px border all round.
    expect(
      sliceInsets({ minX: 10, minY: 10, maxX: 54, maxY: 54 }, 64, 64),
    ).toEqual({ top: 10, right: 10, bottom: 10, left: 10 })
  })

  it('never goes negative or past the picture', () => {
    expect(
      sliceInsets({ minX: -5, minY: 0, maxX: 100, maxY: 64 }, 64, 64),
    ).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })
})

describe('imageLayerStyle', () => {
  it('fits, crops and tiles with CSS backgrounds', () => {
    expect(
      imageLayerStyle(propsWith({ ScaleType: 'Fit' }), 'x', 10, 10),
    ).toMatchObject({ backgroundSize: 'contain' })
    expect(
      imageLayerStyle(propsWith({ ScaleType: 'Crop' }), 'x', 10, 10),
    ).toMatchObject({ backgroundSize: 'cover' })
    expect(
      imageLayerStyle(
        propsWith({
          ScaleType: 'Tile',
          TileSize: { xs: 0.5, xo: 0, ys: 0, yo: 32 },
        }),
        'x',
        10,
        10,
      ),
    ).toMatchObject({ backgroundSize: '50% 32px', backgroundRepeat: 'repeat' })
  })

  it('slices with border-image, edges drawn SliceScale times as big', () => {
    const style = imageLayerStyle(
      propsWith({
        ScaleType: 'Slice',
        SliceCenter: { minX: 10, minY: 8, maxX: 54, maxY: 56 },
        SliceScale: 2,
      }),
      'x',
      64,
      64,
    )
    expect(style.borderImageSlice).toBe('8 10 8 10 fill')
    expect(style.borderImageWidth).toBe('16px 20px 16px 20px')
  })
})
