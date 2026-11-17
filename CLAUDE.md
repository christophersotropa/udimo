# Udimo

A browser editor for building Roblox UI with drag and drop. It exports real ScreenGuis as `.rbxmx` files (and a Luau builder script) that drop into Roblox Studio. The full plan is in `docs/PLAN.md`.

## Who I am and how to work with me

- I'm a CS student, beginner-intermediate in Python and new to TypeScript and JS tooling. This is a portfolio piece.
- Most code will be written by you. **Explain every change in plain words**: what each new file does, and why. Define new terms the first time you use them.
- Work in small steps that match the plan's numbered builds. Stop after each build so I can run it and commit. Don't start the next build unless I ask.
- Before each commit, give me a one-line summary of what changed and why, so I can explain it in an interview.
- Suggest a commit message in Conventional Commits format (`feat(canvas): ...`, `fix(export): ...`, `chore: ...`).
- Don't run `git commit` or `git push` yourself. I commit with GitHub Desktop.

## Stack

- npm workspaces monorepo. The editor lives in `apps/web` (Vite + React + TypeScript).
- Planned: Tailwind for the editor's own panels; Zustand + Immer for state; Vitest for tests; Oxlint + Prettier.
- Run from the repo root: `npm run dev`, `npm run build`, `npm run lint`.
- Platform: macOS.

## Architecture rules

- The document is a JSON tree that mirrors Roblox instances (className, name, props, children). Everything reads or writes this one shape.
- `src/model/` and `src/export/` are plain TypeScript with no React, and both get unit tests.
- Roblox UI is rendered with absolutely positioned HTML elements, not `<canvas>`.
- `.rbxmx` output follows Roblox's XML model format v4 (reference: https://dom.rojo.space/xml.html). Enum values are written as numbers.

## Security (public repo)

- Never put API keys or secrets in code. They go in `.env` files, which are git-ignored.
- Anything shipped to the browser is public.
- Don't commit other games' art or screenshots. Tests use placeholder shapes.
- Don't add dependencies without telling me what they are and why we need them.
