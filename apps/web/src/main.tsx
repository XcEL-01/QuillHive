const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

if (API_BASE) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return originalFetch(API_BASE + input, init);
    }
    if (input instanceof Request && input.url.includes(window.location.origin + '/api')) {
      const newUrl = input.url.replace(window.location.origin, API_BASE);
      return originalFetch(new Request(newUrl, input), init);
    }
    return originalFetch(input, init);
  };
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { useI18n } from './lib/i18n'
import { setBaseUrl } from '@workspace/api-client-react'

if (API_BASE) {
  setBaseUrl(API_BASE);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Never auto-retry on 4xx errors (especially 429 rate limits).
      // Allow one retry only for transient network/5xx issues.
      retry: (failureCount, error) => {
        const msg = ((error as Error)?.message ?? '').toLowerCase();
        if (
          msg.includes('429') ||
          msg.includes('too many') ||
          msg.includes('rate limit') ||
          msg.includes('401') ||
          msg.includes('403') ||
          msg.includes('404')
        ) {
          return false;
        }
        return failureCount < 1;
      },
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      // Never auto-retry mutations — auth actions must fire exactly once.
      retry: false,
    },
  },
})

useI18n.getState().init().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>
  )
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
