import { useEffect } from 'react'
import { pagesHolding } from '../../model/pages.ts'
import { useDocumentStore } from '../../store/documentStore.ts'

// Turns a UIPageLayout to the page you select, or the page holding what
// you select (say, a button on page 3 picked in the Explorer), so the
// selection is never hidden on a page you can't see.
export function useShowSelectedPage() {
  useEffect(
    // subscribe() calls us after every store change, with the state before
    // it; it returns the function that stops listening, which useEffect
    // calls when the canvas goes away.
    () =>
      useDocumentStore.subscribe((state, before) => {
        if (state.selection === before.selection) return
        const id = state.selection.at(-1) // the one picked last
        if (!id) return
        for (const page of pagesHolding(state.document, id)) {
          state.showPage(page)
        }
      }),
    [],
  )
}
