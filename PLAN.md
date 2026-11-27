# Udimo — Project Plan

Udimo is a browser editor for building Roblox UI visually. You drag and drop frames, text and buttons, then download a real `.rbxmx` file that drops into Roblox Studio as a working ScreenGui. No plugin required, no rebuilding by hand.

## Goals

1. **A real file, zero install.** Download `.rbxmx`, or copy one Luau script into the Command Bar. Both put a working ScreenGui in StarterGui.
2. **Straightforward first.** The editor speaks Roblox (UDim2, Scale vs Offset, AnchorPoint) but hides it until you need it. One "Make responsive" button converts pixel sizes to Scale.
3. **Free and open source.** Simple landing page, no sign-up, straight into the editor.

## Roadmap

Phase 1 (the MVP) is the only phase that has to be great; everything after it is optional. Phases 0 and 1 run in order, Phases 2 to 4 can be reordered, and Phase 6 needs Phase 5's accounts.

**Order decided (Nov 2026):** finish Phase 1 with real images and more of Studio's properties (the builds after 48), then importing `.rbxmx` (Phase 2), then scripting with a node graph (Phase 4), with AI (Phase 3) last. BillboardGui and SurfaceGui come later. Releases are only tagged when the project owner says so.

### Phase 0 — Groundwork

- [x] GitHub repo, license, README
- [x] Vite + React + TypeScript app scaffolded, Tailwind added
- [x] Oxlint, Prettier, VS Code settings
- [x] CI on GitHub Actions: lint, test, build on every push
- [x] "Hello world" deployed to a live URL

### Phase 1 — MVP editor

**Document and canvas**

- [x] Instance tree model with a ScreenGui root
- [x] Elements: Frame, TextLabel, TextButton, TextBox, ImageLabel, ImageButton, ScrollingFrame
- [x] Modifiers as toggles: UICorner, UIStroke, UIGradient, UIPadding, UIListLayout, UIGridLayout, UIAspectRatioConstraint
- [x] Canvas inside a device frame (PC, tablet, phone presets), zoom and pan
- [x] Click and Shift-click to select; drag to move; 8 handles to resize; arrow keys to nudge
- [x] Snapping and alignment guides against siblings and the parent
- [x] Insert objects: right-click menu (searchable) and the Insert menu

**Panels**

- [x] Explorer tree: drag to reparent or reorder, rename, hide, lock
- [x] Properties: Position and Size as UDim2 (Scale + Offset), AnchorPoint, colors with transparency, text, font, TextScaled, ZIndex, LayoutOrder, Visible, image asset ID
- [x] "Make responsive" button: convert Offset to Scale (and back)

**Editing basics**

- [x] Undo and redo, copy and paste, duplicate, delete, wrap selection in a Frame
- [x] Autosave in the browser; open and save a project `.json` file

**Export**

- [x] Download `.rbxmx`
- [x] Copy a Luau builder script for the Command Bar
- [x] Export warnings (an image with no asset ID, text likely to overflow on phones)

### Phase 2 — Polish and round trip

- Import an existing `.rbxmx` ScreenGui, edit it, export it again
- Starter templates: shop, HUD, inventory, settings, daily reward
- Align and distribute for multi-select
- Reusable components
- Companion Studio plugin: paste a short code and the GUI lands in StarterGui
- Shortcut cheat sheet and a first-run tour

### Phase 3 — AI prompt to UI

- Done last. Likely "bring your own API key" (each user pastes their own key), so the site never pays for or stores keys; to be decided then
- Describe a screen, get an editable layout (not an image)
- "Edit selection with AI"
- AI output is validated against the same schema the editor uses

### Phase 4 — Interactions, scripts and animation

- A node graph first (like Blueprints): event nodes (Activated, MouseEnter), action nodes (set Visible, tween, fire a RemoteEvent) and logic. It's data in the document, compiled to a readable LocalScript by `export/`
- Interaction presets later, as ready-made graphs: this button opens that frame, tabs, toggles, close buttons
- Hover and press states
- Tween animations on a simple timeline (TweenService)
- A generated LocalScript ships inside the export

### Phase 5 — Accounts and cloud storage

- Sign in, cloud saves with thumbnails and version history, share links

### Phase 6 — Collaboration

- Live multi-user editing with cursors, comments pinned to elements

## Tech stack

The MVP needs no server: export runs in the browser, so hosting is free.

| Layer                | Choice                                     | Why                                                                                                                                  | Phase |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| Language             | TypeScript                                 | Roblox properties have strict shapes (UDim2, Color3, enums); types catch a bad export before Studio does                             | 0     |
| App framework        | React + Vite                               | Fast dev server, simple setup                                                                                                        | 0     |
| App styling          | Tailwind CSS                               | Only for the editor's own panels, not the user's GUI                                                                                 | 0     |
| Canvas               | Plain HTML elements, absolutely positioned | Roblox UI maps almost 1:1 to CSS (UICorner = border-radius, UIStroke = border, UIGradient = linear-gradient, UIListLayout = flexbox) | 1     |
| State                | Zustand + Immer                            | One small store for the document; Immer's structural sharing makes undo snapshots cheap                                              | 1     |
| Tests                | Vitest                                     | Same config as Vite; used most on the exporter                                                                                       | 0     |
| Lint and format      | Oxlint + Prettier                          | Format on save, catch mistakes early; Oxlint is a much faster ESLint alternative                                                     | 0     |
| Hosting              | Vercel, free tier                          | Every push to `main` redeploys; PRs get preview links                                                                                | 0     |
| Studio plugin        | Luau + Rojo                                | Plugin code lives in this repo                                                                                                       | 2     |
| AI service           | Python, FastAPI, Pydantic                  | Pydantic validates AI output against the schema                                                                                      | 3     |
| Accounts and storage | Supabase (Postgres, auth, storage)         | Auth and storage built in                                                                                                            | 5     |
| Collaboration        | Yjs                                        | Standard CRDT library for live editing                                                                                               | 6     |

**The key decision:** the editor's document is a JSON tree that mirrors Roblox instances (class, name, properties, children). The canvas reads it, the exporters write it, the AI produces it, Supabase stores it, Yjs syncs it.

## How export works

One element in the editor's document:

```json
{
  "id": "n7",
  "className": "TextButton",
  "name": "BuyButton",
  "parentId": "n3",
  "props": {
    "Size": { "xs": 0.4, "xo": 0, "ys": 0, "yo": 48 },
    "Position": { "xs": 0.5, "xo": 0, "ys": 1, "yo": -24 },
    "AnchorPoint": { "x": 0.5, "y": 1 },
    "BackgroundColor3": { "r": 0.2, "g": 0.8, "b": 0.4 },
    "Text": "Buy"
  },
  "modifiers": { "UICorner": { "radius": { "s": 0, "o": 12 } } }
}
```

The exporter writes Roblox's XML model format. The root is `<roblox version="4">`, each instance is an `<Item class="..." referent="...">` with typed properties, children nest inside their parent, and enums are written as numbers. Reference: [Rojo's unofficial format spec](https://dom.rojo.space/xml.html).

```xml
<roblox version="4">
  <Item class="ScreenGui" referent="RBX1">
    <Properties><string name="Name">ShopGui</string></Properties>
    <Item class="Frame" referent="RBX2">
      <Properties>
        <string name="Name">Panel</string>
        <UDim2 name="Size"><XS>0.5</XS><XO>0</XO><YS>0.6</YS><YO>0</YO></UDim2>
        <Color3 name="BackgroundColor3"><R>0.1</R><G>0.1</G><B>0.15</B></Color3>
      </Properties>
    </Item>
  </Item>
</roblox>
```

**Getting it into Studio:**

1. **Insert from File** (recommended): right-click StarterGui in the Explorer, choose Insert from File, pick the `.rbxmx`.
2. **Drag and drop** into the viewport. It may land in Workspace; move it into StarterGui.
3. **Luau script:** paste a generated `Instance.new` script into the Command Bar.

**Known limits:** images must already be uploaded to Roblox (`rbxassetid://`); fonts preview with the closest web font; the browser preview is close to Studio, not pixel-identical.

**Testing:** GUIs saved from Studio as `.rbxmx` live in `docs/reference/`, and unit tests compare the exporter's output against them.

### Reference test case: Pet Inventory

Phase 1 is done when Udimo can rebuild this layout and Studio opens the export looking the same. Tests use placeholder shapes, not real game art.

```text
ScreenGui  PetInventoryGui
└─ Frame  Window                    UICorner, thick UIStroke
   ├─ Frame  Header
   │  ├─ ImageLabel  PawIcon
   │  └─ TextLabel  Title           outlined text
   ├─ ImageButton  CloseButton      AnchorPoint (0.5, 0.5) on the top-right corner
   ├─ ScrollingFrame  PetGrid
   │  ├─ UIGridLayout               3 columns
   │  ├─ UIPadding
   │  └─ Frame  PetSlot  (x6)       UICorner, UIStroke
   │     ├─ ImageLabel  PetIcon
   │     ├─ TextLabel  PetName
   │     └─ Frame  SelectedDot
   └─ Frame  DetailsPanel           UICorner, UIStroke
      ├─ TextLabel  PetName
      ├─ TextLabel  Rarity
      ├─ ImageLabel  PetImage
      ├─ TextLabel  Level
      ├─ Frame  XPBar
      │  └─ Frame  Fill             Size X (Scale) = progress
      ├─ TextButton  EquipButton
      └─ ImageButton  DeleteButton
```

## Repo layout

Folders are created when their phase starts.

```text
udimo/
├─ .github/workflows/ci.yml   # lint + test + build on every push and PR
├─ .vscode/                   # recommended extensions, format on save
├─ apps/web/                  # the editor
│  └─ src/
│     ├─ app/                 # app shell, layout, routes
│     ├─ editor/canvas/       # canvas, selection, handles, guides
│     ├─ editor/panels/       # Explorer, Properties, Palette, Toolbar
│     ├─ model/               # types, Roblox class definitions, defaults
│     ├─ store/               # document store, undo/redo
│     ├─ export/              # rbxmx.ts, luau.ts (+ tests)
│     ├─ import/              # rbxmx parser (Phase 2)
│     └─ lib/                 # udim2, color, ids, geometry helpers
├─ plugin/                    # Roblox Studio plugin (Phase 2)
├─ services/ai/               # Python FastAPI service (Phase 3)
├─ docs/                      # this plan, decisions, reference .rbxmx files
└─ package.json               # npm workspaces root
```

`model/` and `export/` contain no React, just plain TypeScript, so they're easy to test and reusable later.

## Git workflow

- Commit when one thing you can describe in a sentence is done and the app still runs. Push at the end of every session.
- Messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `style`. Example: `feat(canvas): drag to move selected element`.
- Every feature: issue → branch (`feat/resize-handles`) → pull request with "Closes #N" → CI passes → squash merge.
- Tag a release per phase: `v0.1.0` for Phase 1, `v0.2.0` for Phase 2.

## Security

- Commits use a GitHub noreply email.
- Secret scanning, push protection and Dependabot are on.
- `.env*`, `node_modules/`, `dist/` and `.DS_Store` are git-ignored.
- No keys in code. Anything shipped to the browser is public, so server keys (AI, Supabase service role) live only on the server or in Vercel environment variables.
- A committed key gets revoked and replaced, not just deleted.

## First sprint

| #   | Build                                                            | Commit                                           |
| --- | ---------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Create the repo, security settings, clone                        | `chore: ignore macOS and env files`              |
| 2   | Scaffold Vite + React + TypeScript in `apps/web`, npm workspaces | `chore: scaffold Vite + React + TypeScript app`  |
| 3   | Tailwind                                                         | `chore: add Tailwind CSS`                        |
| 4   | Oxlint, Prettier, `.vscode/`                                     | `chore: add Prettier and VS Code settings`       |
| 5   | GitHub Actions                                                   | `ci: lint, test and build on every push`         |
| 6   | Deploy to Vercel                                                 | `docs: add live demo link`                       |
| 7   | Empty three-panel editor layout                                  | `feat(editor): add three-panel editor layout`    |
| 8   | Document types (node, UDim2, Color3)                             | `feat(model): define instance tree types`        |
| 9   | Zustand store with tests                                         | `feat(store): add document store with node CRUD` |
| 10  | Render Frames and TextLabels                                     | `feat(canvas): render Frames and TextLabels`     |
| 11  | `.rbxmx` exporter + Download                                     | `feat(export): download ScreenGui as .rbxmx`     |
| 12  | Select and drag                                                  | `feat(canvas): select and drag elements`         |
| 13  | Resize handles                                                   | `feat(canvas): resize with handles`              |
| 14  | Properties panel                                                 | `feat(panels): add properties panel`             |
| 15  | Undo and redo                                                    | `feat(store): undo and redo`                     |

## Second sprint

Finishes Phase 1. Each build that adds a class or modifier starts by saving a reference `.rbxmx` from Studio into `docs/reference/`, and its golden test checks the exporter against it.

| #   | Build                                                                                                                    | Commit                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 16  | Insert palette: click to add a Frame or TextLabel                                                                        | `feat(panels): add insert palette`                         |
| 17  | Keyboard: delete, duplicate, arrow keys to nudge                                                                         | `feat(editor): delete, duplicate and nudge`                |
| 18  | Explorer tree: select, rename, hide, lock                                                                                | `feat(panels): add explorer tree`                          |
| 19  | Explorer drag and drop: reparent and reorder                                                                             | `feat(panels): drag to reparent in explorer`               |
| 20  | Autosave in the browser; open and save a project `.json`                                                                 | `feat(store): autosave and project files`                  |
| 21  | Copy and paste; wrap selection in a Frame                                                                                | `feat(editor): copy, paste and wrap in Frame`              |
| 22  | TextButton and TextBox                                                                                                   | `feat(canvas): add TextButton and TextBox`                 |
| 23  | ImageLabel, ImageButton and ScrollingFrame                                                                               | `feat(canvas): add images and ScrollingFrame`              |
| 24  | Modifiers in the model; UICorner and UIStroke                                                                            | `feat(model): add UICorner and UIStroke`                   |
| 25  | UIGradient, UIPadding, UIAspectRatioConstraint                                                                           | `feat(model): add gradient, padding and aspect ratio`      |
| 26  | UIListLayout and UIGridLayout                                                                                            | `feat(canvas): add list and grid layouts`                  |
| 27  | Device presets (PC, tablet, phone), zoom and pan                                                                         | `feat(canvas): device presets, zoom and pan`               |
| 28  | Snapping and alignment guides                                                                                            | `feat(canvas): snap to siblings and parent`                |
| 29  | "Make responsive": Offset to Scale and back                                                                              | `feat(panels): add make responsive button`                 |
| 30  | Fonts and TextScaled                                                                                                     | `feat(canvas): fonts and TextScaled`                       |
| 31  | Luau builder script for the Command Bar                                                                                  | `feat(export): copy Luau builder script`                   |
| 32  | Export warnings                                                                                                          | `feat(export): warn about common export problems`          |
| 33  | Rebuild the Pet Inventory reference; fix what it finds                                                                   | `test: rebuild the Pet Inventory reference`                |
| 34  | UI overhaul 1: editor shell and export dialog                                                                            | `feat(editor): new top bar and export dialog`              |
| 35  | UI overhaul 2: right-click menus and Explorer (replaces the Insert panel)                                                | `feat(panels): right-click insert and explorer redesign`   |
| 36  | UI overhaul 3: Properties panel redesign                                                                                 | `style(panels): redesign the properties panel`             |
| 37  | UI overhaul 4: toolbar insert tools (draw to add) and canvas labels                                                      | `feat(canvas): draw tools and guide labels`                |
| 38  | New look: theme, top bar with menus, canvas, status bar (draw tools removed)                                             | `feat(editor): new look with menu bar and status bar`      |
| 39  | Explorer and right-click menu in the new look                                                                            | `style(panels): explorer and context menu in the new look` |
| 40  | Studio-style Properties; Rotation, ClipsDescendants, BorderSizePixel                                                     | `feat(panels): studio-style properties`                    |
| 41  | Export dialog redesign; LocalScript stubs; checks listed by path                                                         | `feat(export): export dialog redesign and script stubs`    |
| 42  | ~~Preview: play-test the UI~~ (dropped)                                                                                  | —                                                          |
| 43  | Double-click a text element on the canvas to edit its text                                                               | `feat(canvas): edit text in place`                         |
| 44  | Font weights per font, named like Studio, plus italic (B and I toggles)                                                  | `feat(model): font weights and italic`                     |
| 45  | Dockable side panels: resize, move to either side, or stack both on one side (like Studio)                               | `feat(editor): dockable side panels`                       |
| 46  | Real images on the canvas: preview pictures from your computer (pick or drop a PNG, JPG or BMP); not exported            | `feat(canvas): preview real images`                        |
| 47  | Fix the stray white lines on the canvas in Safari (seams in the scaled checkerboard)                                     | `fix(canvas): stray white lines in Safari`                 |
| 48  | Smooth Explorer dragging: the row itself slides with the pointer and the others make room                                | `feat(explorer): smooth row dragging`                      |
| 49  | Text options: TextWrapped, TextXAlignment and TextYAlignment, TextTransparency, RichText, TextTruncate, LineHeight       | `feat(model): more text options`                           |
| 50  | Image options: ImageColor3, ImageTransparency, ScaleType (Stretch, Fit, Crop, Tile, Slice) with SliceCenter and TileSize | `feat(model): image options and 9-slice`                   |
| 51  | Sizing helpers: AutomaticSize, UIScale, UISizeConstraint, UITextSizeConstraint                                           | `feat(model): automatic size, scale and size constraints`  |
| 51b | Draw AutomaticSize on the canvas (elements grow to fit their text and children); dragging inside a UIScale'd element     | `feat(canvas): draw AutomaticSize`                         |
| 52  | ScrollingFrame options: AutomaticCanvasSize, ScrollingDirection, ScrollBarImageColor3                                    | `feat(model): scrolling frame options`                     |
| 53  | CanvasGroup (GroupTransparency, GroupColor3)                                                                             | `feat(model): add CanvasGroup`                             |
| 54  | Selection box: drag across empty canvas to select every element it touches (Shift + drag adds to the selection)          | `feat(canvas): drag a box to select`                       |
| 55  | `.rbxmx` importer: read a Studio file into a document, with a report of what was left out (no UI yet)                    | `feat(import): read .rbxmx files into a document`          |
| 56  | Import in the editor: File menu, command field and dropping a file on the canvas                                         | `feat(editor): import .rbxmx files`                        |

Showing images by Roblox asset ID is on hold: it needs Roblox's legacy thumbnail API through a server function, and Roblox's Terms of Use need checking first (build 46 research).

Each of 49–53 starts with a reference `.rbxmx` saved from Studio (see above). Importing `.rbxmx` (55–56, Phase 2) was moved ahead of 51–54 in November 2026. Build 54 was "More of Roblox's built-in fonts" until late November 2026, when the selection box took its place; the fonts build is saved for later (it starts with a reference `.rbxmx` too). After these: more fonts, UIPageLayout and UIFlexItem, the node graph (Phase 4), then AI (Phase 3).

Tag `v0.1.0` (the end of Phase 1) when the project owner says so. It's a separate step, not part of a build.
