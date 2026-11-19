// Roblox images live on Roblox's servers, not in the .rbxmx file. A file only
// points at one with a content URI like "rbxassetid://123456789".

// Turns what someone pastes into the Image box into a content URI:
//   "123456789"                                       -> "rbxassetid://123456789"
//   "https://create.roblox.com/store/asset/123/Name"  -> "rbxassetid://123"
//   "rbxassetid://123" or "rbxasset://..."            -> unchanged
// Anything else is left as typed (export warnings, build 32, can flag it).
export function toContentUri(input: string): string {
  const text = input.trim()
  if (text === '') return ''
  if (/^\d+$/.test(text)) return `rbxassetid://${text}`

  // A link to an asset page on the Roblox website: the id is the first
  // all-digits part of the path. The hostname check means only roblox.com
  // links count, not, say, evil.com/roblox.com/123.
  if (URL.canParse(text)) {
    const url = new URL(text)
    const isRoblox =
      url.hostname === 'roblox.com' || url.hostname.endsWith('.roblox.com')
    const id = url.pathname.split('/').find((part) => /^\d+$/.test(part))
    if (isRoblox && id) return `rbxassetid://${id}`
  }
  return text
}
