import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { PerformanceProvider } from './contexts/PerformanceContext.jsx'

import ErrorBoundary from './components/ErrorBoundary.jsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PerformanceProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </PerformanceProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
