import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  side: 'left' | 'right'
  actions?: ReactNode // buttons on the right of the title
  footer?: ReactNode // a line of help pinned to the bottom
  // false: the content goes edge to edge (it brings its own padding).
  padded?: boolean
  // false: no title bar (the title still names the panel for screen readers).
  showTitle?: boolean
  children: ReactNode
}

// A side panel with a title bar. Its content scrolls on its own,
// so a long Explorer tree never scrolls the whole page.
export function Panel({
  title,
  side,
  actions,
  footer,
  padded = true,
  showTitle = true,
  children,
}: PanelProps) {
  const border = side === 'left' ? 'border-r' : 'border-l'

  return (
    <aside
      aria-label={title}
      className={`flex min-h-0 flex-col border-line bg-panel ${border}`}
    >
      {showTitle && (
        <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
          <h2 className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            {title}
          </h2>
          {actions}
        </div>
      )}
      <div
        className={`min-h-0 flex-1 overflow-y-auto ${padded ? 'px-2.5 pb-3' : ''}`}
      >
        {children}
      </div>
      {footer && (
        <p className="border-t border-line px-3.5 py-3 text-xs text-faint">
          {footer}
        </p>
      )}
    </aside>
  )
}
