import type { NodeId } from '../../model/types.ts'
import { convertUnits } from '../../store/commands.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { screenOf, useViewStore } from '../../store/viewStore.ts'

const buttonClass =
  'flex-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200 ring-1 ring-zinc-700 hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-blue-500'

// "Make responsive" and "Use pixels" for the elements `ids`, and everything
// inside them. They convert on the device you're viewing, so nothing moves
// there: switch device afterwards to see the difference.
export function ResponsiveButtons({ ids }: { ids: NodeId[] }) {
  const run = (to: 'scale' | 'offset') =>
    convertUnits(useDocumentStore, ids, to, screenOf(useViewStore.getState()))

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => run('scale')}
          title="Turn pixel sizes and positions into Scale, so this grows and shrinks with the screen. Includes everything inside."
          className={buttonClass}
        >
          Make responsive
        </button>
        <button
          type="button"
          onClick={() => run('offset')}
          title="Turn Scale back into fixed pixels, as measured on this device. Includes everything inside."
          className={buttonClass}
        >
          Use pixels
        </button>
      </div>
      <p className="text-[11px] text-zinc-500">
        Includes everything inside. Nothing moves on this device; switch devices
        to compare. Square things (icons) can stretch: add a
        UIAspectRatioConstraint to keep their shape.
      </p>
    </div>
  )
}
