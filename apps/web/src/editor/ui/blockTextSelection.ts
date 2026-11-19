// Stops the browser highlighting text while something is being dragged,
// and clears any highlight already there. Returns a function that turns
// highlighting back on, for when the drag ends.
//
// Without this, dragging a panel's title bar across the window selects
// every word it passes (the browser treats a press-and-move as selecting).
export function blockTextSelection(): () => void {
  window.getSelection()?.removeAllRanges()
  const style = document.documentElement.style
  style.setProperty('user-select', 'none')
  style.setProperty('-webkit-user-select', 'none') // Safari
  return () => {
    style.removeProperty('user-select')
    style.removeProperty('-webkit-user-select')
  }
}
