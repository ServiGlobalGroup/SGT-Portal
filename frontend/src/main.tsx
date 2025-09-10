import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/mobile-optimization.css'
import App from './App.tsx'

// Silence noisy console output in production (keep errors visible)
if (import.meta.env.PROD) {
  const noop = () => {}
  const c = console as any
  c.log = noop
  c.info = noop
  c.debug = noop
  c.warn = noop
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
