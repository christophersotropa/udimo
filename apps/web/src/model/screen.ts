// The game screens the editor can lay out on. Sizes are in the pixels
// Roblox uses for UI (on phones and tablets these are "points", smaller
// than the real hardware pixels), so Offset means the same thing as in game.
// All landscape, like most Roblox games.
export type ScreenSize = { width: number; height: number }

export const DEVICES = {
  pc: { label: 'PC', width: 1920, height: 1080 },
  tablet: { label: 'Tablet', width: 1024, height: 768 }, // an iPad
  phone: { label: 'Phone', width: 844, height: 390 }, // an iPhone 14
} as const satisfies Record<string, ScreenSize & { label: string }>

export type DeviceId = keyof typeof DEVICES

// The PC screen: the default, and what tests use unless they say otherwise.
export const SCREEN: ScreenSize = DEVICES.pc
