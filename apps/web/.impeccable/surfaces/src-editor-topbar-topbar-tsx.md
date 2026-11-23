---
version: 1
slug: "src-editor-topbar-topbar-tsx"
primary_target: "src/editor/topbar/TopBar.tsx"
related_targets: ["src/index.css","src/app/App.tsx"]
---

# Editor shell: top bar and accent

Scope: the editor shell's top bar, plus the editor-wide accent colour. Mode: Operate. Users: solo indie Roblox devs and team UI designers (PRODUCT.md). Constraints: the incumbent look stays (the owner rejected every new world); Explorer, Properties, dockable panels, shortcuts and Studio property names are untouched; the canvas renders Roblox exactly; amber is retired (Avenlo uses it); the accent is one token because a user setting will customise it later.

Unresolved: the separate selection colour's exact value; whether the old menu bar's shortcuts all move into the command field's results.

## Direction contract

THESIS: The top bar becomes command-first: one Udimo menu and a centred field that inserts objects and runs any action, refusing the five-menu bar every editor ships.

OWN-WORLD: The incumbent shell: near-black flat surfaces (#121212, #181818, #202020), hairline rules, compact 13 px rows, 11 px notes, monospace values. One accent token, dark blue (#2F5BD3 fills, #7FA2FF text and outlines), replacing amber everywhere. Selection gets its own token.

STORY: The user presses ⌘K or clicks the field, types "but", and Enter inserts a TextButton into the selection; File, Edit, View, Insert and Arrange live under the Udimo menu; ShopGui and Export are always visible.

FIRST VIEWPORT: One 44 px bar. Left: "Udimo ▾ / ShopGui". Centre, truly centred: a 440 px command field, "Insert an object or search actions…" with a ⌘K hint. Right: Select/Hand, Desktop·Tablet·Phone, Export in the accent fill. Below: Explorer 240 px, canvas, Properties 280 px, status bar.

FORM: Command bar, position 3 of 6 on the ordered structure list. seed:f9b25f6ca42b5694

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
