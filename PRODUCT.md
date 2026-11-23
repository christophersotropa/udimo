# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary users, served equally:

- **Solo indie Roblox developers** who ship their own games. They know Roblox Studio well and want game UI built faster than typing UDim2 values into Studio's Properties panel and pressing Play to check.
- **UI designers on small Roblox teams** who design the interface and hand it to a scripter. Their work is finished when someone else can script against it.

Both are fluent in Studio's vocabulary (ScreenGui, Frame, UDim2, Scale and Offset, AnchorPoint, UICorner, UIListLayout). Neither needs Roblox concepts explained; both need them shown.

## Product Purpose

Udimo is a browser editor for designing Roblox UI visually and exporting it as real Roblox instances: an `.rbxmx` model file, or a Luau script that builds the ScreenGui with `Instance.new`. Either lands as a normal ScreenGui in StarterGui.

Success: the exported ScreenGui looks and behaves in Studio as it did on Udimo's canvas, with nothing rebuilt by hand.

## Positioning

Udimo exports the actual instances, not a mockup image to rebuild. Its exports are checked against `.rbxmx` files saved from Roblox Studio itself (`docs/reference/`), property by property, so accuracy is tested rather than claimed. The canvas works in Roblox's own units and classes. It is free, open source (MIT), needs no account, and runs entirely in the browser.

## Operating Context

When someone opens Udimo instead of working in Studio directly:

- **Starting a new menu:** laying out a shop, inventory, HUD or similar quickly, before any scripting.
- **Sharing a design:** showing a teammate or client a layout before it is built in the game. Today that means a saved project `.json` file or an export; there is no share link.
- **Iterating on existing UI:** bringing a ScreenGui from a game into Udimo, changing it, and sending it back. This needs `.rbxmx` import, which is planned (PLAN.md, Phase 2) and not built yet.

Udimo is used alongside Roblox Studio on a desktop or laptop. The editor needs a window of at least 800 × 480 px. For the team handoff, instance names and hierarchy are part of the deliverable: scripts reach elements by path.

## Capabilities and Constraints

- Classes: Frame, TextLabel, TextButton, TextBox, ImageLabel, ImageButton, ScrollingFrame. Modifiers: UICorner, UIStroke, UIGradient, UIPadding, UIListLayout, UIGridLayout, UIAspectRatioConstraint.
- Studio-style editing: an Explorer tree and a Properties panel, named and organised as in Studio; undo and redo; copy and paste; snapping and alignment guides; desktop, tablet and phone previews; one-click Offset-to-Scale conversion.
- Export warnings before download: missing image asset IDs, text likely to overflow on phones, elements off-screen, duplicate sibling names.
- Projects autosave in the browser and can be saved and opened as `.json` files. There is no backend and no accounts.
- **The canvas must render Roblox UI exactly as Roblox does.** The editor around it can be redesigned; what it shows of the user's UI cannot be made to look better than Studio would show it.
- Terminology follows Roblox Studio: Explorer, Properties, ScreenGui, class and property names as Studio spells them.
- Undecided or not built: `.rbxmx` import, share links, a node-graph scripting view, AI generation (likely bring-your-own-key), BillboardGui and SurfaceGui.

## Brand Commitments

- The name **Udimo** is fixed.
- The logo (amber stacked squares, `apps/web/public/logo.svg`) may be redrawn.
- The owner considers the current editor too similar to Avenlo; the editor must not resemble it.
- Public repository: no secrets in code, and no other games' art or screenshots.

## Evidence on Hand

- `docs/reference/*.rbxmx`: files saved from Roblox Studio, used as golden test fixtures for the exporters.
- Live demo: https://udimo-udsl.vercel.app
- Built-in starter projects: a Shop and a Pet Inventory.
- No user counts, testimonials, studios using it or benchmarks exist. Do not invent any. The README's demo GIF has not been recorded yet.

## Product Principles

1. **Studio is the source of truth.** What the canvas shows is what Studio will show. Never trade fidelity for polish.
2. **Speak Roblox fluently.** Use Studio's names, units and structure; the users already know them, so don't rename or hide concepts.
3. **The handoff is the product.** The export has to be clean for the next person: sensible names, the right hierarchy, warnings before problems ship.
4. **Fast to a first layout.** Starting a new menu should take minutes, not a session of typing values.
5. **Free, local, no account.** Open the page and start; nothing to sign up for.

## Accessibility & Inclusion

The editor targets WCAG 2.2 AA: readable contrast for text people need to read, every panel usable with the keyboard (the Explorer works as a keyboard tree), and screen-reader names for controls.
