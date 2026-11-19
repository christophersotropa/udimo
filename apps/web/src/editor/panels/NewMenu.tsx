import { useEffect, useRef, useState } from 'react'
import { createPetInventoryDocument } from '../../app/petInventory.ts'
import { createSampleDocument } from '../../app/sampleDocument.ts'
import { createEmptyDocument } from '../../model/document.ts'
import type { UiDocument } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { confirmReplace } from './confirmReplace.ts'

// What "New" can start from.
const STARTERS: { label: string; hint: string; make: () => UiDocument }[] = [
  {
    label: 'Empty ScreenGui',
    hint: 'Start from nothing',
    make: createEmptyDocument,
  },
  {
    label: 'Shop example',
    hint: 'The small starter layout',
    make: createSampleDocument,
  },
  {
    label: 'Pet Inventory example',
    hint: 'The reference layout: grid, list, modifiers, fonts',
    make: createPetInventoryDocument,
  },
]

// The toolbar's "New" button and the starters it offers.
export function NewMenu({ buttonClass }: { buttonClass: string }) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // Close when clicking anywhere else, or pressing Escape.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function start(make: () => UiDocument) {
    setOpen(false)
    if (confirmReplace()) useDocumentStore.getState().loadDocument(make())
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title="Start a new design"
        className={buttonClass}
      >
        New ▾
      </button>
      {open && (
        <ul className="absolute top-full left-0 z-50 mt-1 w-64 rounded-md bg-zinc-900 p-1 shadow-xl ring-1 ring-zinc-700">
          {STARTERS.map((starter) => (
            <li key={starter.label}>
              <button
                type="button"
                onClick={() => start(starter.make)}
                className="w-full rounded px-2 py-1.5 text-left hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                <span className="block text-sm text-zinc-100">
                  {starter.label}
                </span>
                <span className="block text-xs text-zinc-500">
                  {starter.hint}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
