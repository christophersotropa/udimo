import type { PreviewImage } from './types.ts'

// For tests only: a tiny stand-in preview picture (the bytes don't
// matter). Not used by the app, so it's never shipped.
export const PICTURE: PreviewImage = {
  name: 'pet.png',
  dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
  width: 64,
  height: 32,
}
