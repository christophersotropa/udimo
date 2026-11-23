import type { ReactNode } from 'react'
import { useViewStore } from '../../store/viewStore.ts'
import { CloseIcon } from '../panels/icons.tsx'
import { Button, IconButton } from '../ui/Button.tsx'
import { Dialog } from '../ui/Dialog.tsx'

// After importing an .rbxmx file (topbar/projectFiles.ts): what came in,
// what was left out, and which values didn't fit; or why the file couldn't
// be imported. Shown only when there's something to say beyond "it worked"
// (that goes to the status bar instead).
export function ImportReportDialog() {
  const report = useViewStore((state) => state.importReport)
  const close = () => useViewStore.getState().setImportReport(null)

  return (
    <Dialog
      open={report !== null}
      onClose={close}
      label="Import"
      width="w-[520px]"
    >
      {report && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-line py-2.5 pr-3 pl-5">
            <h2 className="truncate text-title font-semibold">
              {report.title}
            </h2>
            <IconButton label="Close" onClick={close}>
              <CloseIcon size={14} />
            </IconButton>
          </div>

          <div className="space-y-4 p-5">
            {report.error ? (
              <p className="text-body text-pretty text-ink">{report.error}</p>
            ) : (
              <>
                <p className="text-body text-ink">{report.summary}</p>
                {report.skipped.length > 0 && (
                  <Section
                    title="Left out"
                    hint="Udimo doesn’t have these classes yet. They’re still in your file in Studio."
                  >
                    {report.skipped}
                  </Section>
                )}
                {report.notes.length > 0 && (
                  <Section
                    title="Changed to fit"
                    hint="These values were set back to their defaults or adjusted."
                  >
                    {report.notes}
                  </Section>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end border-t border-line px-5 py-3">
            <Button variant="primary" onClick={close} autoFocus>
              Done
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: string[]
}): ReactNode {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs text-muted">
        {title} <span className="font-mono">({children.length})</span>
      </h3>
      <p className="text-xs text-pretty text-muted">{hint}</p>
      <ul className="max-h-48 overflow-y-auto rounded bg-app ring-1 ring-line">
        {children.map((line, i) => (
          <li
            key={i}
            className="border-t border-line px-3 py-1.5 text-xs text-pretty text-ink first:border-t-0"
          >
            {line}
          </li>
        ))}
      </ul>
    </div>
  )
}
