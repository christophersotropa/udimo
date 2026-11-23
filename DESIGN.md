---
name: Udimo
description: A browser editor for building Roblox UI, dressed as a quiet dark workbench that sits beside Roblox Studio.
colors:
  app: '#121212'
  panel: '#181818'
  raised: '#202020'
  hover: '#2a2a2a'
  line: '#2a2a2a'
  ink: '#e4e4e4'
  muted: '#9a9a9a'
  faint: '#636363'
  accent-fill: '#3563e0'
  accent-fill-hover: 'color-mix(in oklab, #3563e0, black 15%)'
  accent: 'color-mix(in oklab, #3563e0, white 45%)'
  accent-hover: 'color-mix(in oklab, #3563e0, white 65%)'
  accent-ink: '#ffffff'
  accent-soft: 'color-mix(in srgb, #3563e0 20%, transparent)'
  select: 'color-mix(in oklab, #3563e0, white 45%)'
  select-soft: 'color-mix(in srgb, #3563e0 20%, transparent)'
  select-ink: '#0b1633'
  warn: '#e3c84a'
  danger: '#e5534b'
  guide: '#e0457b'
  screen: '#232323'
  screen-alt: '#1d1d1d'
typography:
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', Arial, sans-serif"
    fontSize: '15px'
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', Arial, sans-serif"
    fontSize: '13px'
    fontWeight: 400
    lineHeight: 1.5
  body-strong:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', Arial, sans-serif"
    fontSize: '13px'
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', Arial, sans-serif"
    fontSize: '12px'
    fontWeight: 400
    lineHeight: 1.333
  note:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', Arial, sans-serif"
    fontSize: '11px'
    fontWeight: 400
    lineHeight: 1.5
  value:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    fontSize: '12px'
    fontWeight: 400
    lineHeight: 1.333
  mono-note:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    fontSize: '11px'
    fontWeight: 400
    lineHeight: 1.5
  badge:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    fontSize: '10px'
    fontWeight: 600
    lineHeight: 1.5
rounded:
  check: '3px'
  base: '4px'
  dialog: '6px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '20px'
components:
  button-primary:
    backgroundColor: '{colors.accent-fill}'
    textColor: '{colors.accent-ink}'
    typography: '{typography.body-strong}'
    rounded: '{rounded.base}'
    padding: '0 12px'
    height: '28px'
  button-primary-hover:
    backgroundColor: '{colors.accent-fill-hover}'
    textColor: '{colors.accent-ink}'
  button-secondary:
    backgroundColor: '{colors.raised}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.base}'
    padding: '0 12px'
    height: '28px'
  button-secondary-hover:
    backgroundColor: '{colors.hover}'
  button-ghost:
    textColor: '{colors.muted}'
    typography: '{typography.body}'
    rounded: '{rounded.base}'
    padding: '0 12px'
    height: '28px'
  button-ghost-hover:
    backgroundColor: '{colors.hover}'
    textColor: '{colors.ink}'
  icon-button:
    textColor: '{colors.muted}'
    rounded: '{rounded.base}'
    size: '28px'
  icon-button-active:
    backgroundColor: '{colors.accent-soft}'
    textColor: '{colors.accent}'
  value-field:
    backgroundColor: '{colors.app}'
    textColor: '{colors.ink}'
    typography: '{typography.value}'
    rounded: '{rounded.base}'
    padding: '0 6px'
    height: '24px'
  command-field:
    backgroundColor: '{colors.raised}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.base}'
    padding: '0 8px'
    height: '28px'
    width: 'clamp(220px, 30vw, 440px)'
  menu:
    backgroundColor: '{colors.raised}'
    rounded: '{rounded.base}'
    padding: '4px 0'
  menu-item:
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    padding: '4px 12px'
  menu-item-hover:
    backgroundColor: '{colors.hover}'
  segmented-control:
    backgroundColor: '{colors.app}'
    rounded: '{rounded.base}'
    padding: '2px'
  segmented-option:
    textColor: '{colors.muted}'
    typography: '{typography.body}'
    rounded: '{rounded.base}'
    padding: '0 12px'
    height: '24px'
  segmented-option-active:
    backgroundColor: '{colors.hover}'
    textColor: '{colors.ink}'
  tree-row:
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.base}'
    height: '24px'
  tree-row-selected:
    backgroundColor: '{colors.select-soft}'
    textColor: '{colors.select}'
  panel:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
  dialog:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
    rounded: '{rounded.dialog}'
    width: '760px'
  top-bar:
    backgroundColor: '{colors.panel}'
    padding: '0 10px'
    height: '44px'
  status-bar:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.muted}'
    typography: '{typography.mono-note}'
    padding: '0 12px'
    height: '28px'
---

# Design System: Udimo

## Overview

**Creative North Star: "The Quiet Workbench"**

Udimo is a tool people use for an hour at a time, next to Roblox Studio, while they build a shop menu or a HUD. The editor's own look stays out of the way so the user's game UI is the brightest, most colourful thing on screen. The chrome is near-black and flat, split into areas by one-pixel lines. Rows are compact, the type is small and plain, and any number you can edit is set in monospace. One dark blue accent marks the few things that matter right now: the main action (Export), the current tool, what is selected, and where keyboard focus is.

The layout follows Studio on purpose: an Explorer tree, a canvas, and a Properties panel, with Studio's own names for classes and properties. The top bar puts commands first. On the left is a single **Udimo** menu that holds File, Edit, View, Insert and Arrange. In the middle is a command field (⌘K) that inserts any object or runs any action. On the right are the tools, the device preview switch, and Export. There is no row of five menus across the top.

This system covers the **editor chrome only**. The canvas draws the user's Roblox UI exactly as Roblox would draw it, using the user's own colours, fonts, corners and strokes (`apps/web/src/editor/canvas/NodeView.tsx`, `nodeStyle.ts`, `imageStyle.ts`, `RichTextView.tsx`). Nothing in this file applies to that drawing. The only parts of the canvas this system styles are the editor's own overlays: selection outlines and handles, alignment guides, the size label, the checkerboard behind the game screen, and the zoom bar.

**Key Characteristics:**

- Dark, flat, neutral grey surfaces in four steps, with no colour tint.
- One accent token, picked by hand, with every other blue worked out from it in CSS.
- Hairline borders and rings instead of shadows. Shadows appear only on things that float above the page.
- Small type (13 px rows, 11–12 px notes) in the system UI font, with monospace for values.
- Studio's structure and names, plus a command-first top bar.
- The canvas shows Roblox's rendering, never a prettier version of it.

## Colors

A grey-scale workbench with one blue that marks action, selection and focus, plus yellow, red and pink kept for warnings, deleting and guides.

### Primary

- **Workbench Blue** (`accent-fill`, #3563E0): the one accent colour picked by hand. It fills the primary button (Export, Download, Copy), the badge in the Explorer, and the logo's filled square. White text on it has a contrast ratio of 5.2:1. Every other blue in the editor is mixed from this value, so changing it re-colours the whole editor.
- **Pressed Blue** (`accent-fill-hover`): Workbench Blue mixed with 15% black (about #294EB4), used when the pointer is over a filled button. Hover makes it darker, not lighter, because a lighter blue would drop white text below 4.5:1.
- **Signal Blue** (`accent`): Workbench Blue mixed with 45% white (about #8CACF3). This is the blue for text, outlines and focus rings on the dark panels, where Workbench Blue itself would be too dim (3.4:1). Signal Blue reaches 7.2–7.9:1. It is used for focus rings, checkbox ticks, the caret, the active tool's icon, accent text links like "Convert to Scale" and "Add", and the chosen option in the Export dialog.
- **Bright Signal Blue** (`accent-hover`): 65% white (about #B5CAF9). The hover colour for accent text links.
- **Blue Wash** (`accent-soft`): Workbench Blue at 20% opacity. A tinted background behind the active tool, text selection, the chosen Export format, and an Explorer drop target.

### Selection

- **Selection** (`select`, `select-soft`): the selection colour has its own tokens. It covers canvas outlines and resize handles, selected Explorer rows, and the highlighted row in the command results. For now these tokens point at Signal Blue and Blue Wash, but they are kept separate so selection can get its own colour later without touching the brand accent.
- **Selection Ink** (`select-ink`, #0B1633): dark navy text on a solid selection background, such as the canvas size label ("768 × 540").

### Signals

- **Warning Yellow** (`warn`, #E3C84A): status-bar notices, save failures, and warning hints under fields. It is yellow, not blue, so a warning never looks like a selection.
- **Delete Red** (`danger`, #E5534B): destructive menu items, such as Delete.
- **Guide Pink** (`guide`, #E0457B): alignment guides on the canvas while you drag. It has to stand out against both the chrome and any colour the user might pick.

### Neutral

- **Workbench Floor** (`app`, #121212): the darkest layer. It sits behind the canvas, and it is also the fill for text boxes, checkboxes and the segmented control, so those inputs read as pressed into the panel.
- **Panel Grey** (`panel`, #181818): side panels, the top bar, the status bar, and dialogs.
- **Raised Grey** (`raised`, #202020): menus, the command field and its results, secondary buttons, and dragged rows. These are things that sit one step above a panel.
- **Hover Grey** (`hover`, #2A2A2A): the background under the pointer, and the chosen segment of the device switch.
- **Hairline** (`line`, #2A2A2A): every border, divider and 1 px ring. It has the same value as Hover Grey on purpose: a line and a hover state are equally quiet.
- **Ink** (`ink`, #E4E4E4): main text. 14:1 on Panel Grey.
- **Muted** (`muted`, #9A9A9A): secondary text that people read, such as property names, hints, shortcuts and group headings. 6.3:1 on Panel Grey.
- **Faint** (`faint`, #636363): only for things nobody needs to read, such as disabled command rows, hidden elements, modifier icons, and the "/" before the design name. At about 3:1 it fails as body text, and it is never used for that.
- **Checkerboard** (`screen` #232323 and `screen-alt` #1D1D1D): the 16 px checkerboard behind the game screen. It is the usual design-tool sign for "nothing drawn here", and its tiles always land on whole screen pixels.

### Class-family colours

Small outline icons in the Explorer and the Insert lists are coloured by family so you can tell kinds apart quickly. These are Tailwind's stock colours, not theme tokens (`apps/web/src/editor/panels/ClassIcon.tsx`): containers (Frame, ScrollingFrame) sky-400, text (TextLabel, TextBox) emerald-400, buttons (TextButton, ImageButton) rose-300, images (ImageLabel) violet-400, modifiers Faint, and the ScreenGui in Ink. None of them uses the accent token.

### Named Rules

**The One Hand-Picked Blue Rule.** `accent-fill` is the only accent value anyone picks. Every other accent shade is a `color-mix()` of it, and no component writes a blue hex of its own. A planned setting will let users choose their accent, and it has to work by changing one token.

**The Rare Accent Rule.** The accent marks the main action, the current tool, selection, focus, and a handful of text actions. Menu rows, section headers and ordinary buttons use a neutral grey highlight on hover, never blue. If a screen has more than one filled blue button, one of them is wrong.

**The No Amber Rule.** Amber is retired from the editor chrome (Avenlo uses it), and the accent is never set to an amber or orange. Warning Yellow is a status colour, not the accent, and it stays on warnings.

## Typography

**Body Font:** the system UI font (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Noto Sans, Arial, sans-serif). It is Tailwind's default sans stack, and nothing is downloaded.
**Mono Font:** ui-monospace, then SF Mono, Menlo, Consolas, monospace. Also the system's own font.

**Character:** the operating system's own fonts at small sizes, as in a native app's inspector. The sans is for names and words. The mono is for anything you could type into Roblox: values, sizes, coordinates, shortcuts.

The editor adds four named sizes to Tailwind's defaults (`apps/web/src/index.css`): `text-title` 15 px, `text-body` 13 px, `text-note` 11 px, `text-badge` 10 px. Tailwind's `text-xs` (12 px) fills the step between body and note and is used a lot.

### Hierarchy

- **Title** (600, 15 px, 1.5): dialog titles, such as "Export". This is the largest text in the working editor.
- **Body** (400, 13 px, 1.5): Explorer rows, menu items, buttons, the command field and its results, and Properties text inputs that hold words.
- **Body Strong** (600, 13 px): panel titles ("Explorer", "Properties"), Properties section headers, the "Udimo" menu button, and primary buttons.
- **Label** (400, 12 px): property names in Properties, hints under menu items, dialog explanations, and panel footers.
- **Value** (mono 400, 12 px): every editable value box in Properties ("{0.5, 0}, {0.5, 0}", "35, 40, 60"), the zoom percentage, and code-like text in the Export dialog.
- **Note** (400, 11 px; mono in the status bar and for shortcuts): group headings in menus and command results, keyboard shortcuts, the ⌘K hint, field hints, and the whole status bar.
- **Badge** (mono 600, 10 px): tiny counts in Explorer rows.

The small-screen notice, which covers the editor below 800 × 480 px, is the one place with larger type: a 20 px semibold heading and 16 px body text, because it is read on phones.

### Named Rules

**The Mono Means Value Rule.** If a string is a value Roblox would accept (a UDim2, a Color3, a pixel size, a position, a shortcut), set it in the mono font. Names, labels and sentences stay in the sans. A property name is sans; its value is mono.

**The Small Steps Rule.** Text sizes in the chrome are 15, 13, 12, 11 and 10 px, and nothing else. A new screen reuses these steps. Hierarchy comes from weight (600 against 400) and colour (Ink against Muted), not from bigger sizes.

## Layout

The editor fills the window exactly (`h-svh`), and the page itself never scrolls: only the panels scroll inside. It is a three-row grid: the top bar (44 px), the workspace, and the status bar (28 px). The workspace holds the canvas between two docked side panels. Explorer starts on the left and Properties on the right. Users can drag either panel to the other side, stack both on one side, and resize a side from 220 px to 480 px.

The top bar is a `1fr auto 1fr` grid, so the command field stays truly centred whatever the sides hold. The field is `clamp(220px, 30vw, 440px)` wide.

Density is set by a few fixed heights:

- **24 px**: Explorer rows, Properties rows, value boxes, segmented options.
- **28 px**: buttons, icon buttons, the command field and its result rows, the zoom bar, and the status bar.
- **32 px**: Properties section headers. **36 px**: panel title bars. **44 px**: the top bar.

Spacing follows Tailwind's 4 px steps. Most spacing is 4, 6, 8, 10 and 12 px: 12 px side padding in panels and menus, 8 px gaps in the top bar, and 4 px between rows. Dialogs open up to 20 px padding. A property row is a two-column grid: the label column is 40% of the panel's width (never under 100 px), and the value takes the rest.

Below 800 × 480 px the editor is covered by a full-screen notice with a "Continue anyway" button. There is no phone layout of the editor itself.

## Elevation & Depth

Surfaces are flat. Depth comes from tone (Floor, then Panel, then Raised) and from 1 px Hairline borders and rings. Shadows appear only on things that float above the page and could cover other content: menus, the command results, dialogs, the panel-dock preview, and an Explorer row while it is dragged. Panels, bars and buttons never cast a shadow.

### Shadow Vocabulary

- **Float** (`box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5)`, with a 1 px Hairline ring): popover menus, the Udimo menu, the right-click menu, and the command results.
- **Modal** (`box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.6)`, with a 1 px Hairline ring, over a `rgb(0 0 0 / 0.6)` backdrop): dialogs (Export).
- **Hint** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)`): the small label that shows where a dragged panel will dock.
- **Lifted Row** (`box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-select) 45%, transparent), 0 8px 20px rgb(0 0 0 / 0.45)`): an Explorer row while it is being dragged, on Raised Grey.

### Named Rules

**The Flat Until Floating Rule.** Anything docked into the layout is flat and outlined. A shadow means "this is above the page and will go away". Never use a shadow to make a panel or a button look important.

## Shapes

Corners are small and nearly uniform. Almost everything uses 4 px: buttons, inputs, menus, the command field, rows, the segmented control, and badges. Dialogs use 6 px. Drawn checkboxes use 3 px. Only the radio dots in the Export dialog are fully round. Borders are 1 px Hairline, usually drawn as a ring (an inset box shadow) so they don't change an element's size. On hover a ring stays Hairline or moves to Hover Grey, and on focus it turns Signal Blue.

The logo is two plain squares: an outlined square in the text colour, with a filled Workbench Blue square overlapping its corner, like a UI element dropped onto a screen. It has sharp corners, which separates it from the softly rounded controls around it.

Icons are inline SVG line drawings on a 16-unit grid, drawn at 14 px with a 1.5 stroke (1.4 for class icons) and round caps. They take the colour of the text around them. There is no icon library.

## Components

### Buttons

Compact and quiet. There are three variants and a square icon button, all in `apps/web/src/editor/ui/Button.tsx`. Every button in the editor uses one of them.

- **Shape:** 28 px tall, gently squared corners (4 px), 12 px side padding, 13 px text, a 6 px gap before an optional icon.
- **Primary:** Workbench Blue fill, white semibold text. Only for the main action on screen: Export in the top bar, and Download or Copy in the Export dialog. On hover the fill darkens to Pressed Blue.
- **Secondary:** Raised Grey with a 1 px Hairline ring and Ink text. It turns Hover Grey on hover. The default for ordinary actions.
- **Ghost:** no fill, Muted text. On hover it gets a Hover Grey fill and Ink text. Used for quiet toolbar and menu actions.
- **Icon button:** a 28 px square with only an icon. It has a screen-reader label and a matching tooltip. When active (the current tool), it gets a Blue Wash fill with a Signal Blue icon.
- **Focus:** a 2 px Signal Blue outline, 2 px outside the button, shown only for keyboard focus.
- **Disabled:** 40% opacity, and it can't be clicked.

### Inputs / Fields

- **Value boxes (Properties):** 24 px tall, Workbench Floor fill (so they look pressed into the panel), a 1 px Hairline ring, 4 px corners, and Ink text in the 12 px mono. On hover the ring turns Hover Grey; on focus it turns Signal Blue. What you type is read when you press Enter or click away. Text that can't be read puts the old value back, and Escape cancels.
- **Text inputs for words** (Text, PlaceholderText) use the same box with the sans font.
- **Filter fields** (Explorer, Properties): the same pressed-in look, 28 px tall, with 13 px text and a Muted placeholder.
- **Checkboxes:** drawn by the editor, not the browser. A 16 px Floor box with a Hairline ring and 3 px corners, with a Signal Blue tick laid over it as an icon, so the tick follows the accent token.
- **Caret:** Signal Blue in every input.

### Command field (signature component)

The centre of the top bar: a 28 px Raised Grey field with a search icon, the placeholder "Insert an object or search actions…", and a ⌘K hint in a small Hairline-ringed key. Focusing it turns the ring Signal Blue and opens a results list right underneath. The list is Raised, uses the Float shadow, and is at most 24 rem tall. Rows are 28 px tall: a class icon (or a tick column), the name, a Muted note on the right ("into Window"), the shortcut in mono, and ↵ on the row Enter would run. The highlighted row uses the selection tint (Blue Wash background, Signal Blue text), the same as a selected Explorer row. Rows that can't run right now are drawn in Faint. With no search typed, rows appear in groups with 11 px Muted headings. Once you type, rows are ranked and each one names its group on the right. Screen readers treat it as a combobox.

### Menus

- **Box:** Raised Grey, 4 px corners, Hairline ring, Float shadow, 4 px of space above and below the items. Menus are drawn on top of the whole page and moved back inside the window if they would stick out.
- **Item:** 13 px Ink text with 12 px side padding. It can have a 12 px Muted hint underneath, a mono 11 px shortcut on the right, and a tick column for on/off items. Hover and keyboard focus get a neutral Hover Grey background, and keyboard focus adds an inset Signal Blue ring. Destructive items use Delete Red text. Disabled items are 35% opacity.
- **Udimo menu:** the logo, "Udimo" in semibold, and a chevron in a 28 px button. It opens as two columns 26 rem wide: the menu names on the left, and the items of the pointed-at menu on the right. Arrow keys move between columns.

### Segmented control (device switch)

A Workbench Floor track with a Hairline ring and 2 px of padding. Each option is 24 px tall with 13 px text. The chosen option gets Hover Grey with Ink text, and the others are Muted. The chosen device is shown in neutral grey, not blue. Screen readers treat it as a group of radio buttons.

### Navigation: Explorer tree

Rows are 24 px with 4 px corners, a class icon, and the instance name in 13 px. Each nesting level is indented, with 1 px Hairline lines down the levels. A selected row gets a Blue Wash background and Signal Blue text. The keyboard-focused row gets a 1 px Signal Blue outline. A drop target "inside" a row gets Blue Wash with a Signal Blue ring. Hidden elements are Faint. Modifier rows (UICorner and others) are Muted with a Faint diamond icon. Colour changes on rows fade over 100 ms.

### Panels

Panel Grey, separated from the canvas by a 1 px Hairline on their inner edge. The title bar is 36 px tall, with a 13 px semibold title, and can be dragged to dock the panel elsewhere. Content scrolls on its own. An optional footer is 12 px Muted text above a Hairline. Properties sections fold under 32 px headers with a chevron that turns 90°. An accent text action can sit on the right of a section header ("Convert to Scale", "Add").

### Dialogs

The browser's own modal dialog: Panel Grey, 6 px corners, Hairline ring, Modal shadow, 760 px wide (never wider than the window minus 2 rem). The header has a 15 px semibold title above a Hairline. The body is split into two columns by a Hairline. The footer has the actions, with the primary button on the right. Escape or a click on the dimmed backdrop closes it.

### Status bar

A 28 px Panel Grey strip under a Hairline. All its text is 11 px mono in Muted. The selected element's name and class are in Ink. Groups are split by 12 px-tall Hairline dividers. Snapping and the zoom level are clickable and turn Ink on hover. Passing notices and save failures appear in Warning Yellow.

### Canvas overlays (editor chrome on the canvas)

Selection is a 1.5 px Selection-coloured outline with 7 px square handles. The size label under the selection is a Selection-filled tag with Selection Ink text in 11 px mono. Alignment guides are Guide Pink, and their distance labels are Guide Pink tags with white text. The game screen sits on the 16 px checkerboard, with its name and resolution in Muted mono above it. All these sizes stay the same on screen at every zoom level. The zoom bar is a small Panel Grey group in the bottom-right corner with a Hairline ring.

## Do's and Don'ts

### Do:

- **Do** use the theme tokens (`bg-panel`, `text-muted`, `ring-line`, `bg-accent-fill`, and so on) for every colour in the chrome. To change the look, edit `apps/web/src/index.css`, not the components.
- **Do** derive any new accent shade from `--color-accent-fill` with `color-mix()`, so a user-chosen accent re-colours it.
- **Do** use the `select` tokens for anything that means "this is selected", and the `accent` tokens for action and focus, even while they share a value.
- **Do** build new controls from `Button`, `IconButton`, `Popover`/`MenuItem`, `Dialog`, `SegmentedControl` and `CheckBoxInput` (`apps/web/src/editor/ui/`), so every button and menu looks and behaves the same.
- **Do** keep text people read at Muted (#9A9A9A) or brighter. Faint is only for disabled, hidden or decorative things.
- **Do** give every control a visible keyboard focus: a 2 px Signal Blue outline, or a Signal Blue ring on fields and menu rows.
- **Do** use Studio's spelling for classes and properties (BackgroundColor3, UDim2, ScreenGui) in every label.

### Don't:

- **Don't** style the user's Roblox UI on the canvas. It is drawn exactly as Roblox draws it, with the user's colours and fonts, and must never look better than Studio would show it.
- **Don't** write a blue hex (or any accent colour) directly into a component, an SVG or a style. The one exception is the static `public/logo.svg` favicon, which can't read CSS variables.
- **Don't** use amber or orange as the accent.
- **Don't** colour hover states, menu rows or ordinary buttons with the accent. Hover is Hover Grey.
- **Don't** use Warning Yellow or Delete Red for anything other than warnings and destructive actions. Don't use the accent for a warning.
- **Don't** add shadows to panels, bars or buttons. Shadows are only for menus, dialogs and dragged items.
- **Don't** add text sizes outside 15 / 13 / 12 / 11 / 10 px, or download fonts for the chrome.
- **Don't** let the page scroll. Only panels and lists scroll inside the fixed-height app.
