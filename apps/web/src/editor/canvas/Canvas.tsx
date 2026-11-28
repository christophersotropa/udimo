import { type CSSProperties, useLayoutEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDocumentStore } from '../../store/documentStore.ts'
import { currentView, screenOf, useViewStore } from '../../store/viewStore.ts'
import { canEditTextOnCanvas, isImageClass } from '../../model/classes.ts'
import { openMenuFor } from '../menus/openMenu.ts'
import { insertImageFromFile, previewFromFile } from '../previewImage.ts'
import { NodeView } from './NodeView.tsx'
import { ZoomBar } from './ZoomBar.tsx'
import { CanvasOverlay } from './CanvasOverlay.tsx'
import { useCanvasPointer } from './useCanvasPointer.ts'
import { useShowSelectedPage } from './useShowSelectedPage.ts'
import { importRbxmxFile } from '../topbar/projectFiles.ts'

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
  const { handlers, cursor, marquee } = useCanvasPointer(view.zoom)
  useShowSelectedPage()

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

  // An image file dropped at (clientX, clientY), in window pixels: onto an
  // image element, it becomes that element's preview; anywhere else, a new
  // ImageLabel showing it, centred where it was dropped. If the file can't
  // be used, the status bar says why.
  async function dropImage(file: File, clientX: number, clientY: number) {
    const under = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>('[data-node-id]')
    const target = under
      ? useDocumentStore.getState().document.nodes[under.dataset.nodeId!]
      : undefined
    let error: string | null
    if (target && isImageClass(target.className)) {
      useDocumentStore.getState().select(target.id)
      error = await previewFromFile(target.id, file)
    } else {
      // Window pixels to game pixels: from the canvas area's corner, less
      // where the screen sits in it, divided by the zoom.
      const box = areaRef.current!.getBoundingClientRect()
      const point = {
        x: (clientX - box.left - view.x) / view.zoom,
        y: (clientY - box.top - view.y) / view.zoom,
      }
      error = await insertImageFromFile(file, point, screen)
    }
    if (error) useViewStore.getState().showNotice(error)
  }

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
      // Double-click a text element to edit its text right there.
      // The element is found from the pointer's position, not the event's
      // target: pressing an element captures the pointer for dragging
      // (see useCanvasPointer), and while it's captured the browser reports
      // clicks as happening on the canvas itself.
      onDoubleClick={(event) => {
        const under = document.elementFromPoint(event.clientX, event.clientY)
        const id = under?.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId
        const node = id && useDocumentStore.getState().document.nodes[id]
        if (!id || !node || !canEditTextOnCanvas(node)) return
        if (useViewStore.getState().tool !== 'select') return
        useDocumentStore.getState().select(id)
        useViewStore.getState().setEditingTextId(id)
      }}
      // Drop a file from your computer: an .rbxmx from Studio is imported
      // (topbar/projectFiles.ts); an image goes onto an image element to
      // preview it there, anywhere else as a new ImageLabel showing it.
      // dragover must say "a drop is welcome here", or the browser just
      // opens the file in the tab.
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={(event) => {
        const file = event.dataTransfer.files[0]
        if (!file) return
        event.preventDefault()
        if (/\.rbxmx?$/i.test(file.name)) void importRbxmxFile(file)
        else void dropImage(file, event.clientX, event.clientY)
      }}
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
      {/* This box takes the zoomed size, at the view's position. The
          checkerboard is painted here, not on the scaled screen inside:
          scaled to an in-between zoom (say 40.3%), its tiles stop
          landing on whole pixels and Safari draws thin white seams between
          them while the zoom changes. Here, unscaled, the squares are a
          fixed size on screen at any zoom, like other design tools. */}
      <div
        className="screen-checker absolute ring-1 ring-line"
        style={{
          left: view.x,
          top: view.y,
          width: screen.width * view.zoom,
          height: screen.height * view.zoom,
        }}
      >
        {/* Above the screen: the ScreenGui's name on the left, the screen
            size on the right (the zoom is in the zoom bar). */}
        <p className="absolute -top-6 right-0 left-0 flex justify-between gap-3 font-mono text-note whitespace-nowrap text-muted">
          <span className="truncate">{rootName}</span>
          <span>
            {screen.width} × {screen.height}
          </span>
        </p>
        <div
          className="relative overflow-hidden"
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
      {/* The selection box, drawn on the canvas area rather than inside
          the screen, so it still shows where it reaches past the screen's
          edge. Its corners are game pixels, turned back into area pixels
          with the current view. */}
      {marquee && (
        <div
          className="pointer-events-none absolute border border-select bg-select-soft"
          style={{
            left: view.x + marquee.x * view.zoom,
            top: view.y + marquee.y * view.zoom,
            width: marquee.width * view.zoom,
            height: marquee.height * view.zoom,
          }}
        />
      )}
      <ZoomBar />
    </main>
  )
}
