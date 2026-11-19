import type { NodeId } from '../../model/types.ts'
import { convertUnits } from '../../store/commands.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { screenOf, useViewStore } from '../../store/viewStore.ts'

// "Make responsive" (and the way back, "use pixels") for the elements
// `ids` and everything inside them. They convert on the device you're
// viewing, so nothing moves there: switch device afterwards to compare.
export function ResponsiveButtons({ ids }: { ids: NodeId[] }) {
  const run = (to: 'scale' | 'offset') =>
    convertUnits(useDocumentStore, ids, to, screenOf(useViewStore.getState()))

  return (
    <div className="space-y-1.5 pt-1">
      <button
        type="button"
        onClick={() => run('scale')}
        title="Turn pixel sizes and positions into Scale, so this grows and shrinks with the screen. Includes everything inside."
        className="h-8 w-full rounded-md bg-accent-soft text-sm font-medium text-ink ring-1 ring-accent/50 hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-accent"
      >
        Make responsive (convert to Scale)
      </button>
      <p className="text-xs text-faint">
        Includes everything inside, and nothing moves on this device.{' '}
        <button
          type="button"
          onClick={() => run('offset')}
          className="text-muted underline underline-offset-2 hover:text-ink"
        >
          Use pixels instead
        </button>
      </p>
    </div>
  )
}
