import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

if (import.meta.env.PROD) {
  registerSW({ immediate: true })
} else {
  if ('serviceWorker' in navigator) {
    const swCleanKey = 'dev_sw_cleaned'
    const alreadyCleaned = sessionStorage.getItem(swCleanKey) === '1'

    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister())
    })
    if ('caches' in window) {
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    }

    if (!alreadyCleaned) {
      sessionStorage.setItem(swCleanKey, '1')
      setTimeout(() => {
        window.location.reload()
      }, 0)
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
