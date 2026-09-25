import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { router } from './routes'
import { ErrorBoundary } from './components/ErrorBoundary'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
      <Toaster position="top-center" toastOptions={{ duration: 2500 }} />
    </ErrorBoundary>
  </StrictMode>,
)
