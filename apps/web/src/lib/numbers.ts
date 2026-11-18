// What someone typed into a number box, as a number, or null if it isn't one
// (empty, "-", "abc"). Spaces around it are fine.
export function parseNumberInput(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

// A number for display, at most 3 decimal places, so 0.1 + 0.2 shows as
// "0.3" and not "0.30000000000000004". The stored value isn't changed.
export function formatNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000)
}

// `value` kept between `min` and `max`.
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
