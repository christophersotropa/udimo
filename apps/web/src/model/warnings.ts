import { toContentUri } from '../lib/assets.ts'
import { isImageClass, isTextClass } from './classes.ts'
import { resolveProps } from './defaults.ts'
import { absoluteBox, contentArea } from './layout.ts'
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
  message: string
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

// Studio's grey placeholder picture, which new images start with.
const PLACEHOLDER_IMAGE = 'rbxasset://textures/ui/GuiImagePlaceholder.png'

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

// ---------- The checks ----------

function imageWarnings(doc: UiDocument, id: NodeId): Warning[] {
  const node = doc.nodes[id]
  if (!isImageClass(node.className)) return []
  const image = resolveProps(node).Image
  const uri = toContentUri(image)
  const say = (message: string): Warning[] => [
    { key: `image:${id}`, nodeId: id, level: 'warning', message },
  ]

  if (uri === PLACEHOLDER_IMAGE) {
    return say(
      `"${node.name}" still shows Studio's placeholder picture. Upload your image to Roblox and paste its ID.`,
    )
  }
  if (uri === '') {
    return say(`"${node.name}" has no image, so it will show nothing.`)
  }
  if (!/^rbxassetid:\/\/\d+$/.test(uri) && !uri.startsWith('rbxasset://')) {
    return say(
      `"${node.name}" has an image that doesn't look like a Roblox ID ("${image}"). Paste the image's ID or its Roblox link.`,
    )
  }
  return []
}

// Text that doesn't fit inside its box (inside any padding) on a device.
function textWarnings(
  doc: UiDocument,
  id: NodeId,
  measure: MeasureText,
): Warning[] {
  const node = doc.nodes[id]
  if (!isTextClass(node.className)) return []
  const p = resolveProps(node)
  if (p.TextScaled) return [] // it shrinks to fit by itself
  const text =
    node.className === 'TextBox' && p.Text === '' ? p.PlaceholderText : p.Text
  if (text === '') return []

  const lines = text.split('\n')
  const needWidth = Math.max(
    ...lines.map((line) => measure(line, p.FontFace, p.TextSize)),
  )
  const needHeight = lines.length * p.TextSize

  const tooSmallOn = (Object.keys(DEVICES) as DeviceId[]).filter((device) => {
    const area = contentArea(node, absoluteBox(doc, id, DEVICES[device]))
    return needWidth > area.width + 0.5 || needHeight > area.height + 0.5
  })
  if (tooSmallOn.length === 0) return []
  return [
    {
      key: `text:${id}`,
      nodeId: id,
      level: 'warning',
      message: `The text in "${node.name}" may not fit on ${deviceList(tooSmallOn)}. Turn on TextScaled, or make the box bigger.`,
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
    message: `"${doc.nodes[id].name}" goes past the edge of the screen on ${deviceList(devices)}. Try "Make responsive", or move it in.`,
  }))
}

// Top-level elements in the top strip, where Roblox's top bar is.
function topBarWarning(doc: UiDocument): Warning[] {
  const nearTop = doc.nodes[doc.rootId].children.filter((id) => {
    const box = absoluteBox(doc, id, DEVICES.pc)
    return resolveProps(doc.nodes[id]).Visible && box.y < TOP_BAR_HEIGHT
  })
  if (nearTop.length === 0) return []
  const names = nearTop.map((id) => `"${doc.nodes[id].name}"`).join(', ')
  return [
    {
      key: 'topbar',
      nodeId: nearTop[0],
      level: 'info',
      message: `${names} ${nearTop.length === 1 ? 'sits' : 'sit'} in the top ${TOP_BAR_HEIGHT} px. In game, Roblox lays your UI out below its top bar, so everything starts a little lower than on the canvas.`,
    },
  ]
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
        message: `${ids.length} elements in "${doc.nodes[parentId].name}" are called "${name}". Scripts find elements by name, so give each a different one.`,
      })
    }
  }
  return warnings
}

// ---------- All of them ----------

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
        message: 'The ScreenGui is empty: there is nothing to export yet.',
      },
    ]
  }
  return [
    ...elements.flatMap((id) => [
      ...imageWarnings(doc, id),
      ...textWarnings(doc, id, measure),
    ]),
    ...offScreenWarnings(doc),
    ...duplicateNameWarnings(doc),
    ...topBarWarning(doc),
  ]
}
