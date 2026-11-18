import { type CSSProperties, useRef } from 'react'
import { useDocumentStore } from '../../store/documentStore.ts'
import { NodeView } from './NodeView.tsx'
import { useCanvasPointer } from './useCanvasPointer.ts'
import { useFitScale } from './useFitScale.ts'

// The game screen is laid out at its real size (a 1080p PC screen), so
// Offset pixels mean the same thing as in Roblox. Then the whole screen is
// shrunk with a CSS transform to fit the canvas area.
const SCREEN = { width: 1920, height: 1080 }

export function Canvas() {
  const areaRef = useRef<HTMLElement>(null)
  const scale = useFitScale(areaRef, SCREEN.width, SCREEN.height)
  const rootId = useDocumentStore((state) => state.document.rootId)
  const pointerHandlers = useCanvasPointer(scale)

  return (
    // The pointer handlers sit on the whole canvas area, so clicking the dark
    // space around the screen also clears the selection.
    // select-none stops text from highlighting while dragging; touch-none
    // stops touch screens from scrolling instead of dragging.
    <main
      ref={areaRef}
      {...pointerHandlers}
      className="relative flex min-h-0 min-w-0 touch-none items-center justify-center overflow-hidden bg-zinc-950 select-none"
    >
      {/* This box takes the shrunk size, so flexbox can center it. */}
      <div
        className="shrink-0 ring-1 ring-zinc-700"
        style={{ width: SCREEN.width * scale, height: SCREEN.height * scale }}
      >
        <div
          className="relative overflow-hidden bg-zinc-800"
          style={
            {
              width: SCREEN.width,
              height: SCREEN.height,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              // A CSS variable, so the selection outline can undo the shrink
              // and stay 2 screen pixels thick at any zoom.
              '--canvas-scale': scale,
            } as CSSProperties
          }
        >
          <NodeView id={rootId} />
        </div>
      </div>

      <p className="absolute bottom-2 left-3 text-xs text-zinc-500">
        {SCREEN.width} × {SCREEN.height} · {Math.round(scale * 100)}%
      </p>
    </main>
  )
}
