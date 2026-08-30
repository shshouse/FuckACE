import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

const ext = window as unknown as Record<string, any>

function loadExternalScript(src: string, onload?: () => void) {
  const script = document.createElement('script')
  script.defer = true
  script.src = src
  if (onload) script.onload = onload
  document.head.appendChild(script)
}
const e2Url = import.meta.env.VITE_E2_URL
const e2Global = import.meta.env.VITE_E2_GLOBAL
const e2Id = import.meta.env.VITE_E2_ID
if (e2Url && e2Global && e2Id) {
  loadExternalScript(e2Url, () => ext[e2Global]?.init?.({ id: e2Id, ck: e2Id }))
}
const e3Url = import.meta.env.VITE_E3_URL
const e3Global = import.meta.env.VITE_E3_GLOBAL
if (e3Url && e3Global) {
  ext[e3Global] = ext[e3Global] || []
  loadExternalScript(e3Url)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)