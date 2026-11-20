<p align="center">
  <img src="apps/web/public/logo.svg" alt="Udimo logo" width="72">
</p>

<h1 align="center">Udimo</h1>

<p align="center">
  A browser editor for Roblox UI. Design visually, then export a real ScreenGui that drops straight into Roblox Studio.
</p>

<p align="center">
  <a href="https://udimo-udsl.vercel.app"><strong>Live demo</strong></a> ·
  <a href="PLAN.md">Roadmap</a> ·
  <a href="#how-it-works">How it works</a>
</p>

<p align="center">
  <img src="https://github.com/christophersotropa/udimo/actions/workflows/ci.yml/badge.svg" alt="CI status">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license">
</p>

<!-- TODO: record a 10–20 second GIF: insert a Frame → resize → Export → Insert from File in Studio → it appears.
     Save it as docs/media/demo.gif (keep it under ~5 MB) and uncomment the line below. -->
<!-- ![Designing a shop menu in Udimo and opening it in Roblox Studio](docs/media/demo.gif) -->

## Why

Building UI in Roblox Studio means typing UDim2 values into a properties panel and pressing Play to see the result. Most web design tools that target Roblox only produce mockup images you then rebuild by hand. Udimo lets you design on a canvas that speaks Roblox (Scale and Offset, AnchorPoint, UICorner, UIListLayout) and exports the actual instances.

## Features

- **Real exports.** Download an `.rbxmx` model file, or copy a Luau script that builds the GUI with `Instance.new`. Either way you get a normal ScreenGui in StarterGui.
- **Studio-style editing.** Explorer tree with right-click insert and drag-to-reparent, a Properties panel with UDim2 fields, undo/redo, copy/paste, snapping and alignment guides.
- **Responsive by design.** Preview on desktop, tablet and phone sizes, and convert pixel Offsets to Scale in one click.
- **The classes you actually use.** Frame, TextLabel, TextButton, TextBox, ImageLabel, ImageButton and ScrollingFrame, plus UICorner, UIStroke, UIGradient, UIPadding, UIListLayout, UIGridLayout and UIAspectRatioConstraint.
- **Export checks.** Warnings for common problems before you export, like an image with no asset ID or text that will overflow on phones.
- **No account.** Runs entirely in your browser and autosaves locally. Projects can be saved and reopened as `.json` files.

## How it works

```
 Editor (React)          Document (JSON tree)            Exporters
 ┌─────────────┐  edits  ┌─────────────────────┐  reads  ┌──────────────────────┐
 │ Canvas      │ ──────▶ │ className, name,    │ ──────▶ │ rbxmx.ts → .rbxmx    │
 │ Explorer    │ ◀────── │ props, children     │         │ luau.ts  → Luau      │
 │ Properties  │ renders │ (Zustand + Immer)   │         └──────────────────────┘
 └─────────────┘         └─────────────────────┘
```

- The whole design is one **JSON tree that mirrors Roblox instances**. The canvas renders it, the panels edit it, and the exporters write it out.
- The canvas draws each instance as an absolutely positioned HTML element. Roblox UI maps closely to CSS: UICorner becomes `border-radius`, UIStroke a border, UIListLayout flexbox.
- `model/` and `export/` are plain TypeScript with no React, so the core logic is easy to test on its own.

### Keeping exports accurate

The hard part of this project is producing files Studio reads exactly right: enum tokens, fonts, color sequences, default values. `docs/reference/` holds `.rbxmx` files I saved from Roblox Studio itself, and the exporter tests compare Udimo's output against them property by property. When Studio and Udimo disagree, the test fails.

## Tech stack

|          |                                                   |
| -------- | ------------------------------------------------- |
| Language | TypeScript                                        |
| UI       | React 19, Tailwind CSS                            |
| State    | Zustand + Immer (undo/redo via snapshots)         |
| Build    | Vite, npm workspaces                              |
| Testing  | Vitest, about 900 tests                           |
| Quality  | Oxlint, Prettier, GitHub Actions CI on every push |
| Hosting  | Vercel                                            |

## Run locally

Requires Node 22.12 or newer.

```sh
npm install
npm run dev      # start the editor at http://localhost:5173
npm test         # run the test suite
npm run build    # type-check and build for production
```

## Project structure

```
apps/web/src/
├─ model/     # document types, Roblox classes, layout and snapping logic
├─ export/    # .rbxmx and Luau exporters (+ tests)
├─ store/     # document store, undo/redo, autosave
├─ editor/    # React UI: canvas, panels, menus, export dialog
└─ lib/       # UDim2, color, text and geometry helpers
docs/reference/   # .rbxmx files saved from Roblox Studio, used by the tests
```

## Roadmap

Next up: importing existing `.rbxmx` files, starter templates, then a node-graph editor for button logic that compiles to a LocalScript. AI prompt-to-UI comes last. See [PLAN.md](PLAN.md) for the full plan.

Eventually I hope to build a Roblox studio plugin which makes the import and export process more seamless, and users can generate high GUIs directly inside of studio.

## How it was built

I built Udimo with Claude Code as a pair programmer. I wrote the plan and chose the architecture, reviewed every change before committing, and set up the Roblox Studio reference tests that keep the exporter in check. Each feature went through its own branch, pull request and CI run.

## License

[MIT](LICENSE). Udimo is a fan-made tool and is not affiliated with Roblox Corporation.
