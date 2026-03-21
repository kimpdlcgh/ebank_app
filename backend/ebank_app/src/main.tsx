import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Hostinger can serve clean paths without preserving hash routes.
// Normalize '/some-path' to '/#/some-path' so HashRouter resolves correctly.
const { pathname, search, hash } = window.location
if (!hash.startsWith('#/') && pathname !== '/') {
  window.history.replaceState(null, '', `/#${pathname}${search}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
