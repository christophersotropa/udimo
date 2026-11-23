import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Web copies of Roblox fonts, for drawing text on the canvas (see
// model/fonts.ts). Each import adds one font weight to the page.
// Every weight these two have (Source Sans 3 starts at 200). A browser only
// downloads a weight once some text on the page uses it.
import '@fontsource/source-sans-3/200.css'
import '@fontsource/source-sans-3/300.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/500.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/source-sans-3/700.css'
import '@fontsource/source-sans-3/800.css'
import '@fontsource/source-sans-3/900.css'
import '@fontsource/source-sans-3/200-italic.css'
import '@fontsource/source-sans-3/300-italic.css'
import '@fontsource/source-sans-3/400-italic.css'
import '@fontsource/source-sans-3/500-italic.css'
import '@fontsource/source-sans-3/600-italic.css'
import '@fontsource/source-sans-3/700-italic.css'
import '@fontsource/source-sans-3/800-italic.css'
import '@fontsource/source-sans-3/900-italic.css'
import '@fontsource/roboto/100.css'
import '@fontsource/roboto/200.css'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/600.css'
import '@fontsource/roboto/700.css'
import '@fontsource/roboto/800.css'
import '@fontsource/roboto/900.css'
import '@fontsource/roboto/100-italic.css'
import '@fontsource/roboto/200-italic.css'
import '@fontsource/roboto/300-italic.css'
import '@fontsource/roboto/400-italic.css'
import '@fontsource/roboto/500-italic.css'
import '@fontsource/roboto/600-italic.css'
import '@fontsource/roboto/700-italic.css'
import '@fontsource/roboto/800-italic.css'
import '@fontsource/roboto/900-italic.css'
import '@fontsource/fredoka-one/400.css'
import '@fontsource/luckiest-guy/400.css'
import App from './app/App.tsx'
import { createSampleDocument } from './app/sampleDocument.ts'
import { measureLineHeight, measureTextWidth } from './lib/text.ts'
import { fontCss } from './model/fonts.ts'
import { setTextMetrics } from './model/textMetrics.ts'
import {
  getBrowserStorage,
  loadAutosave,
  startAutosave,
} from './store/autosave.ts'
import { useDocumentStore } from './store/documentStore.ts'
import { loadPanelLayout, savePanelLayout } from './store/panelLayout.ts'
import { useViewStore } from './store/viewStore.ts'

// Text is measured by the browser for the sizing maths (AutomaticSize
// growing to fit text; see model/textMetrics.ts). Web fonts arrive after
// the first drawing, and change how wide text is, so when they do, every
// size is worked out again: an empty update makes every part of the canvas
// re-check its sizes, and only the ones that changed redraw.
setTextMetrics({
  width: (text, font, size) => measureTextWidth(text, fontCss(font, size)),
  lineHeight: (font) => measureLineHeight(fontCss(font, 100)),
})
document.fonts.addEventListener('loadingdone', () =>
  useDocumentStore.setState({}),
)

// Before the first render: reopen your autosaved work, or show the starter
// layout on your first visit. Then keep autosaving from here on.
const storage = getBrowserStorage()
const saved = storage ? loadAutosave(storage) : null
useDocumentStore.getState().loadDocument(saved ?? createSampleDocument())
const { setSaveStatus } = useViewStore.getState()
if (storage) startAutosave(useDocumentStore, storage, undefined, setSaveStatus)
else setSaveStatus('off')

// The panel layout you left: restore it, and save it whenever it changes.
if (storage) {
  useViewStore.setState({ panels: loadPanelLayout(storage) })
  useViewStore.subscribe((state, before) => {
    if (state.panels !== before.panels) savePanelLayout(storage, state.panels)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
