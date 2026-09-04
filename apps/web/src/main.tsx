import { API_BASE_URL, apiUrl } from "./lib/api";

if (API_BASE_URL) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/api")) {
      return originalFetch(apiUrl(input), init);
    }
    if (input instanceof URL && input.origin === window.location.origin && input.pathname.startsWith("/api")) {
      return originalFetch(apiUrl(`${input.pathname}${input.search}`), init);
    }
    if (input instanceof Request && input.url.startsWith(`${window.location.origin}/api`)) {
      return originalFetch(new Request(apiUrl(`${input.url.replace(window.location.origin, "")}`), input), init);
    }
    return originalFetch(input, init);
  };
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            window.location.reload();
          }
        });
      });
      reg.update();
    });
  });
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { useI18n } from './lib/i18n'
import { setBaseUrl } from '@workspace/api-client-react'

if (API_BASE_URL) {
  setBaseUrl(API_BASE_URL);
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
      // Never auto-retry mutations - auth actions must fire exactly once.
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
