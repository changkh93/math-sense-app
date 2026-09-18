import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App, { preparePublicEntry } from './App.jsx'

import ErrorBoundary from './components/ErrorBoundary.jsx'

const queryClient = new QueryClient()

function mountApp() {
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

}
// Keep prerendered public content visible while its interactive module loads.
// On failure, mount the existing error boundary/retry flow rather than stall.
preparePublicEntry(window.location.pathname).then(mountApp, mountApp)
