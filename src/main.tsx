import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import '@fontsource-variable/fraunces/soft.css'
import './index.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(<App />)
