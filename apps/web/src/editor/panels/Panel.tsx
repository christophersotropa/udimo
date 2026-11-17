import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  side: 'left' | 'right'
  children: ReactNode
}

// A side panel with a title bar. Its content scrolls on its own,
// so a long Explorer tree never scrolls the whole page.
export function Panel({ title, side, children }: PanelProps) {
  const border = side === 'left' ? 'border-r' : 'border-l'

  return (
    <aside
      aria-label={title}
      className={`flex min-h-0 flex-col border-zinc-800 bg-zinc-900 ${border}`}
    >
      <h2 className="border-b border-zinc-800 px-3 py-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
        {title}
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </aside>
  )
}
