import { type CSSProperties, useLayoutEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDocumentStore } from '../../store/documentStore.ts'
import { currentView, screenOf, useViewStore } from '../../store/viewStore.ts'
import { openMenuFor } from '../menus/openMenu.ts'
import { NodeView } from './NodeView.tsx'
import { CanvasOverlay } from './CanvasOverlay.tsx'
import { useCanvasPointer } from './useCanvasPointer.ts'

// The game screen is laid out at its real size (the chosen device's), so
// Offset pixels mean the same thing as in Roblox. Then the whole screen is
// zoomed with a CSS transform and placed where the view says.
export function Canvas() {
  const areaRef = useRef<HTMLElement>(null)
  const rootId = useDocumentStore((state) => state.document.rootId)
  const screen = useViewStore(screenOf)
  const rootName = useDocumentStore(
    (state) => state.document.nodes[state.document.rootId].name,
  )
  const view = useViewStore(useShallow(currentView))
  const { handlers, cursor } = useCanvasPointer(view.zoom)

  useLayoutEffect(() => {
    const area = areaRef.current
    if (!area) return
    const { setArea, zoomBy, panBy } = useViewStore.getState()

    // ResizeObserver calls us whenever the canvas area changes size (window
    // resized, panels changed), so "fit" always fits.
    const observer = new ResizeObserver(([entry]) => {
      setArea({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(area)

    // The mouse wheel (or two fingers on a trackpad) pans; with Cmd/Ctrl
    // held, or a trackpad pinch (which browsers report as Ctrl + wheel), it
    // zooms around the pointer. This listener is added by hand, not with
    // React's onWheel, because React's wheel listeners aren't allowed to
    // call preventDefault(), and without it Ctrl + wheel would zoom the
    // whole web page instead.
    function onWheel(event: WheelEvent) {
      event.preventDefault()
      // Some mice report lines instead of pixels (deltaMode 1).
      const unit = event.deltaMode === 1 ? 16 : 1
      if (event.ctrlKey || event.metaKey) {
        const box = area!.getBoundingClientRect()
        const point = {
          x: event.clientX - box.left,
          y: event.clientY - box.top,
        }
        zoomBy(Math.exp(-event.deltaY * unit * 0.01), point)
      } else {
        panBy(-event.deltaX * unit, -event.deltaY * unit)
      }
    }
    area.addEventListener('wheel', onWheel, { passive: false })

    // Safari reports a trackpad pinch as its own "gesture" events instead.
    // `scale` is how far the fingers have spread since the pinch began, so
    // each change zooms by how much it grew since the last one.
    let lastScale = 1
    function onGestureStart(event: Event) {
      event.preventDefault()
      lastScale = 1
    }
    function onGestureChange(event: Event) {
      event.preventDefault()
      const gesture = event as Event & {
        scale: number
        clientX: number
        clientY: number
      }
      const box = area!.getBoundingClientRect()
      const point = {
        x: gesture.clientX - box.left,
        y: gesture.clientY - box.top,
      }
      zoomBy(gesture.scale / lastScale, point)
      lastScale = gesture.scale
    }
    area.addEventListener('gesturestart', onGestureStart)
    area.addEventListener('gesturechange', onGestureChange)

    return () => {
      observer.disconnect()
      area.removeEventListener('wheel', onWheel)
      area.removeEventListener('gesturestart', onGestureStart)
      area.removeEventListener('gesturechange', onGestureChange)
    }
  }, [])

  return (
    // The pointer handlers sit on the whole canvas area, so clicking the dark
    // space around the screen also clears the selection.
    // select-none stops text from highlighting while dragging; touch-none
    // stops touch screens from scrolling instead of dragging.
    <main
      ref={areaRef}
      {...handlers}
      // Right-click: the menu for the element under the pointer, or for
      // the ScreenGui on empty canvas. (Locked elements let the click
      // through, like a left click.)
      onContextMenu={(event) => {
        event.preventDefault()
        const element = (event.target as Element).closest<HTMLElement>(
          '[data-node-id]',
        )
        openMenuFor(
          element?.dataset.nodeId ?? rootId,
          event.clientX,
          event.clientY,
        )
      }}
      style={{ cursor }}
      className="relative min-h-0 min-w-0 touch-none overflow-hidden bg-app select-none"
    >
      {/* This box takes the zoomed size, at the view's position. */}
      <div
        className="absolute ring-1 ring-line"
        style={{
          left: view.x,
          top: view.y,
          width: screen.width * view.zoom,
          height: screen.height * view.zoom,
        }}
      >
        {/* Above the screen: the ScreenGui's name on the left, the screen
            size and zoom on the right. */}
        <p className="absolute -top-6 right-0 left-0 flex justify-between gap-3 font-mono text-[11px] whitespace-nowrap text-faint">
          <span className="truncate">{rootName}</span>
          <span>
            {screen.width} × {screen.height} · {Math.round(view.zoom * 100)}%
          </span>
        </p>
        <div
          className="screen-checker relative overflow-hidden"
          style={
            {
              width: screen.width,
              height: screen.height,
              transform: `scale(${view.zoom})`,
              transformOrigin: 'top left',
              // A CSS variable, so the selection outline can undo the zoom
              // and stay 2 screen pixels thick at any zoom.
              '--canvas-scale': view.zoom,
            } as CSSProperties
          }
        >
          <NodeView id={rootId} />
          {/* Drawn last, so it sits above every element. */}
          <CanvasOverlay />
        </div>
      </div>
    </main>
  )
}
