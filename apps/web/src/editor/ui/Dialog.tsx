import { type ReactNode, useEffect, useRef } from 'react'

// A dialog box over the editor, using the browser's own <dialog> element.
// showModal() gives the important behaviour for free: the page behind is
// dimmed and can't be clicked, keyboard focus stays inside the dialog, and
// Escape closes it (the browser then fires "close", which calls onClose).
export function Dialog({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string // what screen readers announce
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      // A click on the dimmed backdrop lands on the <dialog> itself (its
      // content sits in an inner box), so that closes it too.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="m-auto max-h-[calc(100vh-2rem)] w-[760px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl bg-panel p-0 text-ink shadow-2xl ring-1 ring-line"
    >
      {open && children}
    </dialog>
  )
}
