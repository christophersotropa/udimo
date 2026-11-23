import { toContentUri } from '../lib/assets.ts'
import { richTextPlain } from '../lib/richText.ts'
import { wrappedLineCount } from '../lib/text.ts'
import { isImageClass, isTextClass } from './classes.ts'
import { PLACEHOLDER_IMAGE, resolveProps } from './defaults.ts'
import { absoluteBox, contentArea } from './layout.ts'
import { previewOf } from './previewImages.ts'
import { DEVICES, type DeviceId, type ScreenSize } from './screen.ts'
import type { NodeId, Props, UiDocument } from './types.ts'

// Export warnings: common problems worth fixing before taking a UI into
// Studio. Nothing here stops an export. Plain TypeScript, no React.

export type Warning = {
  // Stable and unique, so the list can use it as a React key.
  key: string
  // The element to select when the warning is clicked, if any.
  nodeId: NodeId | null
  // 'warning': it will look or work wrong. 'info': worth knowing.
  level: 'warning' | 'info'
  // Where it is, the way a script reaches it: "Window.BuyButton" (the
  // names from the ScreenGui down). Missing for the whole screen.
  path?: string
  // What's wrong, briefly: the path already says which element.
  message: string
  // The devices the problem shows up on, so it can be previewed there.
  devices?: DeviceId[]
}

// How wide `text` is in pixels at `size`. The editor passes a real
// measurement from the browser; without one, an estimate is used.
export type MeasureText = (
  text: string,
  font: Required<Props>['FontFace'],
  size: number,
) => number

// A rough guess: most fonts average about half a text size per character.
export const estimateTextWidth: MeasureText = (text, _font, size) =>
  text.length * size * 0.55

// Roughly how tall Roblox's top bar is. In game a ScreenGui is laid out
// below it (Studio's default ScreenInsets, CoreUISafeInsets).
export const TOP_BAR_HEIGHT = 58

// "Phone" or "Phone and Tablet", for messages.
function deviceList(devices: DeviceId[]): string {
  return devices.map((id) => DEVICES[id].label).join(' and ')
}

// Every element in the tree, parents before children (not the ScreenGui).
function allElements(doc: UiDocument): NodeId[] {
  const ids: NodeId[] = []
  const visit = (id: NodeId) => {
    for (const childId of doc.nodes[id].children) {
      ids.push(childId)
      visit(childId)
    }
  }
  visit(doc.rootId)
  return ids
}

// An element's path, the way a script reaches it: its ancestors' names and
// its own, joined with dots, from just inside the ScreenGui ("Window.Buy").
// The ScreenGui itself is just its name.
export function pathOf(doc: UiDocument, id: NodeId): string {
  const names: string[] = []
  let current: NodeId | null = id
  while (current !== null && current !== doc.rootId) {
    names.unshift(doc.nodes[current].name)
    current = doc.nodes[current].parentId
  }
  return names.length > 0 ? names.join('.') : doc.nodes[doc.rootId].name
}

// ---------- The checks ----------

function imageWarnings(doc: UiDocument, id: NodeId): Warning[] {
  const node = doc.nodes[id]
  if (!isImageClass(node.className)) return []
  const image = resolveProps(node).Image
  const uri = toContentUri(image)
  const say = (message: string): Warning[] => [
    {
      key: `image:${id}`,
      nodeId: id,
      level: 'warning',
      path: pathOf(doc, id),
      message,
    },
  ]

  // A picture previewed from your computer isn't on Roblox yet: say so,
  // naming the file to upload.
  const preview = previewOf(doc, node)
  if (preview && (uri === PLACEHOLDER_IMAGE || uri === '')) {
    return say(
      `Previews “${preview.name}”, which isn’t on Roblox yet; upload it and paste its asset ID`,
    )
  }
  if (uri === PLACEHOLDER_IMAGE) {
    return say('Still shows Studio’s placeholder image; paste an asset ID')
  }
  if (uri === '') return say('Image has no asset ID; exports blank')
  if (!/^rbxassetid:\/\/\d+$/.test(uri) && !uri.startsWith('rbxasset://')) {
    return say(`“${image}” doesn’t look like a Roblox image ID`)
  }
  return []
}

// Text that doesn't fit inside its box (inside any padding) on a device.
// RichText tags aren't counted; wrapped text is measured wrapped, spaced by
// LineHeight. Text set to TextTruncate is cut off on purpose, so it's fine.
function textWarnings(
  doc: UiDocument,
  id: NodeId,
  measure: MeasureText,
): Warning[] {
  const node = doc.nodes[id]
  if (!isTextClass(node.className)) return []
  const p = resolveProps(node)
  if (p.TextScaled) return [] // it shrinks to fit by itself
  if (p.TextTruncate !== 'None') return [] // cut off with "…" on purpose
  const placeholder = node.className === 'TextBox' && p.Text === ''
  const raw = placeholder ? p.PlaceholderText : p.Text
  const text = p.RichText && !placeholder ? richTextPlain(raw) : raw
  if (text === '') return []

  const lines = text.split('\n')
  const width = (part: string) => measure(part, p.FontFace, p.TextSize)
  const lineHeight = p.TextSize * p.LineHeight
  // Wrapped: each typed line's words, and a space, for wrapping per device.
  const words = lines.map((line) => line.split(' ').map(width))
  const space = width(' ')

  const tooSmallOn = (Object.keys(DEVICES) as DeviceId[]).filter((device) => {
    const area = contentArea(node, absoluteBox(doc, id, DEVICES[device]), doc)
    if (p.TextWrapped) {
      // Only a single word wider than the box sticks out sideways.
      const lineCount = words.reduce(
        (total, line) => total + wrappedLineCount(line, space, area.width),
        0,
      )
      const widest = Math.max(...words.flat())
      return (
        widest > area.width + 0.5 || lineCount * lineHeight > area.height + 0.5
      )
    }
    const needWidth = Math.max(...lines.map(width))
    return (
      needWidth > area.width + 0.5 ||
      lines.length * lineHeight > area.height + 0.5
    )
  })
  if (tooSmallOn.length === 0) return []
  return [
    {
      key: `text:${id}`,
      nodeId: id,
      level: 'warning',
      path: pathOf(doc, id),
      message: `May overflow on ${deviceList(tooSmallOn).toLowerCase()} at TextSize ${p.TextSize}`,
      devices: tooSmallOn,
    },
  ]
}

function isOffScreen(
  box: { x: number; y: number; width: number; height: number },
  screen: ScreenSize,
): boolean {
  return (
    box.x < -0.5 ||
    box.y < -0.5 ||
    box.x + box.width > screen.width + 0.5 ||
    box.y + box.height > screen.height + 0.5
  )
}

// Elements that stick out past the screen's edges. Only the outermost one
// is reported (its children move with it), and ScrollingFrame contents are
// skipped, since they're meant to scroll.
function offScreenWarnings(doc: UiDocument): Warning[] {
  const devicesFor = new Map<NodeId, DeviceId[]>()
  for (const device of Object.keys(DEVICES) as DeviceId[]) {
    const screen = DEVICES[device]
    const visit = (id: NodeId) => {
      for (const childId of doc.nodes[id].children) {
        const off = isOffScreen(absoluteBox(doc, childId, screen), screen)
        if (off) {
          devicesFor.set(childId, [...(devicesFor.get(childId) ?? []), device])
        }
        // Children move with an off-screen parent, and a ScrollingFrame's
        // contents are meant to scroll: don't look inside either.
        if (!off && doc.nodes[childId].className !== 'ScrollingFrame') {
          visit(childId)
        }
      }
    }
    visit(doc.rootId)
  }
  return [...devicesFor].map(([id, devices]) => ({
    key: `offscreen:${id}`,
    nodeId: id,
    level: 'warning' as const,
    path: pathOf(doc, id),
    message: `Goes off-screen on ${deviceList(devices).toLowerCase()}`,
    devices,
  }))
}

// Top-level elements in the top strip, where Roblox's top bar is. In game
// the ScreenGui is laid out below the bar, so they sit lower than shown.
function topBarWarning(doc: UiDocument): Warning[] {
  return doc.nodes[doc.rootId].children
    .filter((id) => {
      const box = absoluteBox(doc, id, DEVICES.pc)
      return resolveProps(doc.nodes[id]).Visible && box.y < TOP_BAR_HEIGHT
    })
    .map((id) => ({
      key: `topbar:${id}`,
      nodeId: id,
      level: 'info' as const,
      path: pathOf(doc, id),
      message: `In the top ${TOP_BAR_HEIGHT} px: sits lower in game, under Roblox’s top bar`,
    }))
}

// Siblings sharing a name: scripts find elements by name
// (Window.BuyButton), so they can't tell those apart.
function duplicateNameWarnings(doc: UiDocument): Warning[] {
  const warnings: Warning[] = []
  for (const parentId of [doc.rootId, ...allElements(doc)]) {
    const byName = new Map<string, NodeId[]>()
    for (const childId of doc.nodes[parentId].children) {
      const name = doc.nodes[childId].name
      byName.set(name, [...(byName.get(name) ?? []), childId])
    }
    for (const [name, ids] of byName) {
      if (ids.length < 2) continue
      warnings.push({
        key: `names:${parentId}:${name}`,
        nodeId: ids[1],
        level: 'info',
        path: pathOf(doc, parentId),
        message: `${ids.length} children called “${name}”; scripts can’t tell them apart`,
      })
    }
  }
  return warnings
}

// ---------- All of them ----------

// The same problem at the same path (say, six copies of a slot, each with
// a placeholder image, all at "Grid.Slot.Icon") becomes one warning with a
// count, so the list stays readable. The first element is the one selected.
function mergeRepeats(warnings: Warning[]): Warning[] {
  const merged = new Map<string, { warning: Warning; count: number }>()
  for (const warning of warnings) {
    const key = `${warning.path} ${warning.message}`
    const seen = merged.get(key)
    if (seen) seen.count++
    else merged.set(key, { warning, count: 1 })
  }
  return [...merged.values()].map(({ warning, count }) =>
    count === 1
      ? warning
      : { ...warning, message: `${warning.message} (×${count})` },
  )
}

// Every warning for a document: per-element problems in tree order, then
// the whole-screen notes.
export function exportWarnings(
  doc: UiDocument,
  measure: MeasureText = estimateTextWidth,
): Warning[] {
  const elements = allElements(doc)
  if (elements.length === 0) {
    return [
      {
        key: 'empty',
        nodeId: null,
        level: 'info',
        message: 'Nothing to export yet: the ScreenGui is empty',
      },
    ]
  }
  return mergeRepeats([
    ...elements.flatMap((id) => [
      ...imageWarnings(doc, id),
      ...textWarnings(doc, id, measure),
    ]),
    ...offScreenWarnings(doc),
    ...duplicateNameWarnings(doc),
    ...topBarWarning(doc),
  ])
}
