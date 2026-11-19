import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import { createSampleDocument } from './app/sampleDocument.ts'
import {
  getBrowserStorage,
  loadAutosave,
  startAutosave,
} from './store/autosave.ts'
import { useDocumentStore } from './store/documentStore.ts'

// Before the first render: reopen your autosaved work, or show the starter
// layout on your first visit. Then keep autosaving from here on.
const storage = getBrowserStorage()
const saved = storage ? loadAutosave(storage) : null
useDocumentStore.getState().loadDocument(saved ?? createSampleDocument())
if (storage) startAutosave(useDocumentStore, storage)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
