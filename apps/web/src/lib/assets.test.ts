import { describe, expect, it } from 'vitest'
import { toContentUri } from './assets.ts'

describe('toContentUri', () => {
  it('turns a bare id into an rbxassetid URI', () => {
    expect(toContentUri(' 123456789 ')).toBe('rbxassetid://123456789')
  })

  it('takes the id from a Roblox website link', () => {
    expect(
      toContentUri('https://create.roblox.com/store/asset/123/Coin-Icon'),
    ).toBe('rbxassetid://123')
    expect(toContentUri('https://www.roblox.com/library/456/Gem')).toBe(
      'rbxassetid://456',
    )
  })

  it('leaves content URIs alone', () => {
    expect(toContentUri('rbxassetid://789')).toBe('rbxassetid://789')
    expect(toContentUri('rbxasset://textures/ui/GuiImagePlaceholder.png')).toBe(
      'rbxasset://textures/ui/GuiImagePlaceholder.png',
    )
  })

  it('does not trust links from other websites', () => {
    expect(toContentUri('https://evil.com/roblox.com/123')).toBe(
      'https://evil.com/roblox.com/123',
    )
  })

  it('keeps an empty box empty', () => {
    expect(toContentUri('   ')).toBe('')
  })
})
