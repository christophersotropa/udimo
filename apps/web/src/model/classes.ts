import type { ClassName } from './types.ts'

// Facts about Roblox classes, kept in one place so the canvas, the Properties
// panel and the exporter can't disagree.

const TEXT_CLASSES: ClassName[] = ['TextLabel', 'TextButton', 'TextBox']
const IMAGE_CLASSES: ClassName[] = ['ImageLabel', 'ImageButton']
// Classes that are meant to hold other elements. Roblox lets any GUI object
// have children, but a Frame inside a TextLabel is almost never what you want.
const CONTAINER_CLASSES: ClassName[] = ['Frame', 'ScrollingFrame']

// Has Text, TextColor3, TextSize, TextScaled.
export function isTextClass(className: ClassName): boolean {
  return TEXT_CLASSES.includes(className)
}

// Has Image.
export function isImageClass(className: ClassName): boolean {
  return IMAGE_CLASSES.includes(className)
}

export function isContainerClass(className: ClassName): boolean {
  return CONTAINER_CLASSES.includes(className)
}
