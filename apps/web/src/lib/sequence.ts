import type { Color3, ColorKeypoint, NumberKeypoint } from '../model/types.ts'

// Helpers for Roblox sequences (ColorSequence, NumberSequence): lists of
// keypoints from time 0 to time 1, with straight-line blending between them.

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// The two keypoints around `time`, and how far `time` is between them (0..1).
function around<T extends { time: number }>(
  keypoints: T[],
  time: number,
): [T, T, number] {
  for (let i = 1; i < keypoints.length; i++) {
    const before = keypoints[i - 1]
    const after = keypoints[i]
    if (time <= after.time) {
      const span = after.time - before.time
      return [before, after, span > 0 ? (time - before.time) / span : 0]
    }
  }
  const last = keypoints[keypoints.length - 1]
  return [last, last, 0]
}

// The color a ColorSequence has at `time`.
export function colorAt(keypoints: ColorKeypoint[], time: number): Color3 {
  const [a, b, t] = around(keypoints, time)
  return {
    r: lerp(a.color.r, b.color.r, t),
    g: lerp(a.color.g, b.color.g, t),
    b: lerp(a.color.b, b.color.b, t),
  }
}

// The value a NumberSequence has at `time`.
export function numberAt(keypoints: NumberKeypoint[], time: number): number {
  const [a, b, t] = around(keypoints, time)
  return lerp(a.value, b.value, t)
}

// A copy of a sequence with its first ('start') or last ('end') keypoint
// changed. The Properties panel edits a gradient's two ends this way.
export function withEnd<T extends { time: number }>(
  keypoints: T[],
  end: 'start' | 'end',
  change: Partial<Omit<T, 'time'>>,
): T[] {
  const index = end === 'start' ? 0 : keypoints.length - 1
  return keypoints.map((keypoint, i) =>
    i === index ? { ...keypoint, ...change } : keypoint,
  )
}

// True if `keypoints` is a valid sequence: 2 to 20 keypoints, starting at
// time 0, ending at time 1, with times only going up. (Roblox's own rules.)
export function isValidTimeline(keypoints: { time: number }[]): boolean {
  if (keypoints.length < 2 || keypoints.length > 20) return false
  if (keypoints[0].time !== 0) return false
  if (keypoints[keypoints.length - 1].time !== 1) return false
  return keypoints.every((k, i) => i === 0 || k.time >= keypoints[i - 1].time)
}
