import type { ClassName, NodeId, Props, UiDocument, UiNode } from './types.ts'

// Udimo's own project file: the document as JSON, plus a label and a version
// number. Plain TypeScript, no React. Autosave uses the same format.
//
// Opening a file means trusting data we didn't write: it may be from an older
// Udimo, edited by hand, cut short, or not a project at all. So parseProject
// checks everything before the editor sees it, and throws a ProjectFileError
// with a readable message if something is wrong.

const FORMAT = 'udimo'
// Bump this when the document shape changes in a way old files don't follow,
// and teach parseProject to upgrade the old version.
export const PROJECT_VERSION = 1

export class ProjectFileError extends Error {}

function fail(message: string): never {
  throw new ProjectFileError(message)
}

export function serializeProject(doc: UiDocument): string {
  // The 2 adds line breaks and indentation, so the file is readable.
  return JSON.stringify(
    { format: FORMAT, version: PROJECT_VERSION, document: doc },
    null,
    2,
  )
}

export function parseProject(text: string): UiDocument {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    fail('This file is not valid JSON.')
  }
  if (!isRecord(data) || data.format !== FORMAT) {
    fail('This is not an Udimo project file.')
  }
  if (typeof data.version !== 'number' || data.version < 1) {
    fail('This project file has no valid version number.')
  }
  if (data.version > PROJECT_VERSION) {
    fail('This project was saved by a newer version of Udimo.')
  }
  return readDocument(data.document)
}

// ---------- Checking the document ----------

// A plain object like { a: 1 } (not an array, not null).
type JsonRecord = Record<string, unknown>
function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) // no NaN/Infinity
}

// Every class Udimo knows. A Record<ClassName, true> (not a plain list) makes
// TypeScript complain here if a class is ever added to ClassName but not here.
const KNOWN_CLASSES: Record<ClassName, true> = {
  ScreenGui: true,
  Frame: true,
  TextLabel: true,
  TextButton: true,
  TextBox: true,
  ImageLabel: true,
  ImageButton: true,
  ScrollingFrame: true,
}

const isUDim2 = (v: unknown) =>
  isRecord(v) &&
  isNumber(v.xs) &&
  isNumber(v.xo) &&
  isNumber(v.ys) &&
  isNumber(v.yo)
const isVector2 = (v: unknown) => isRecord(v) && isNumber(v.x) && isNumber(v.y)
const isColor3 = (v: unknown) =>
  isRecord(v) && [v.r, v.g, v.b].every((c) => isNumber(c) && c >= 0 && c <= 1)
const isBoolean = (v: unknown) => typeof v === 'boolean'
const isString = (v: unknown) => typeof v === 'string'

// One check per property. The type makes TypeScript insist on a check for
// every property in Props, so a new property can't be forgotten here.
const PROP_CHECKS: Record<keyof Props, (value: unknown) => boolean> = {
  Size: isUDim2,
  Position: isUDim2,
  AnchorPoint: isVector2,
  BackgroundColor3: isColor3,
  BackgroundTransparency: isNumber,
  Visible: isBoolean,
  ZIndex: isNumber,
  LayoutOrder: isNumber,
  Text: isString,
  TextColor3: isColor3,
  TextSize: isNumber,
  TextScaled: isBoolean,
  AutoButtonColor: isBoolean,
  PlaceholderText: isString,
  PlaceholderColor3: isColor3,
  ClearTextOnFocus: isBoolean,
  Image: isString,
  CanvasSize: isUDim2,
  ScrollBarThickness: isNumber,
}

// Ids become keys of the `nodes` object. A key like "__proto__" would change
// how that object behaves instead of adding an entry (a trick called
// prototype pollution), so only simple ids are accepted.
function isSafeId(id: string): boolean {
  return /^[\w-]{1,100}$/.test(id) && !(id in Object.prototype)
}

function readProps(value: unknown, name: string): Props {
  if (!isRecord(value)) fail(`"${name}" has no properties.`)
  const props: JsonRecord = {}
  for (const [key, propValue] of Object.entries(value)) {
    // Properties this version doesn't know (maybe from a newer file) are
    // skipped, so the rest of the project still opens.
    if (!Object.hasOwn(PROP_CHECKS, key)) continue
    if (!PROP_CHECKS[key as keyof Props](propValue)) {
      fail(`"${name}" has an invalid ${key}.`)
    }
    props[key] = propValue
  }
  return props as Props
}

// Builds a fresh node from only the fields Udimo uses.
function readNode(id: string, value: unknown): UiNode {
  if (!isSafeId(id)) fail('The project contains an invalid element id.')
  if (!isRecord(value) || value.id !== id) {
    fail('The project contains a broken element.')
  }
  const { className, name, parentId, children, locked } = value
  if (typeof name !== 'string') fail('An element has no name.')
  if (
    typeof className !== 'string' ||
    !Object.hasOwn(KNOWN_CLASSES, className)
  ) {
    fail(`"${name}" has an unknown class: ${String(className)}.`)
  }
  if (parentId !== null && typeof parentId !== 'string') {
    fail(`"${name}" has an invalid parent.`)
  }
  if (!Array.isArray(children) || !children.every(isString)) {
    fail(`"${name}" has an invalid list of children.`)
  }
  if (locked !== undefined && typeof locked !== 'boolean') {
    fail(`"${name}" has an invalid locked flag.`)
  }

  const node: UiNode = {
    id,
    className: className as ClassName,
    name,
    parentId,
    children: [...children],
    props: readProps(value.props, name),
  }
  if (locked) node.locked = true
  return node
}

function readDocument(value: unknown): UiDocument {
  if (!isRecord(value) || !isRecord(value.nodes) || !isString(value.rootId)) {
    fail('The project has no document in it.')
  }

  const nodes: Record<NodeId, UiNode> = {}
  for (const [id, raw] of Object.entries(value.nodes)) {
    nodes[id] = readNode(id, raw) // readNode rejects unsafe ids first
  }

  const rootId = value.rootId
  const root = nodes[rootId]
  if (!root || root.className !== 'ScreenGui' || root.parentId !== null) {
    fail('The project must start with a ScreenGui.')
  }

  // Walk the tree from the root. Every child must exist, point back at its
  // parent, and be reached only once. That rules out loops and elements
  // listed in two places.
  const reached = new Set<NodeId>([rootId])
  const queue = [root]
  while (queue.length > 0) {
    const parent = queue.shift()!
    for (const childId of parent.children) {
      const child = Object.hasOwn(nodes, childId) ? nodes[childId] : undefined
      if (!child || child.parentId !== parent.id || reached.has(childId)) {
        fail(`The element tree is broken near "${parent.name}".`)
      }
      if (child.className === 'ScreenGui') {
        fail('A ScreenGui can only be the top of the project.')
      }
      reached.add(childId)
      queue.push(child)
    }
  }
  // Anything not reached hangs off nothing: the file is inconsistent.
  if (reached.size !== Object.keys(nodes).length) {
    fail('The project contains elements outside the tree.')
  }

  return { rootId, nodes }
}
