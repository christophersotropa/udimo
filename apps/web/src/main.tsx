import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import { createSampleDocument } from './app/sampleDocument.ts'
import { useDocumentStore } from './store/documentStore.ts'

// Load the starter layout once, before the first render.
useDocumentStore.getState().loadDocument(createSampleDocument())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
