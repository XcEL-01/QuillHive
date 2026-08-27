/**
 * Automatically attaches the JWT token to all outgoing fetch requests.
 * This ensures the generated Orval API client handles authentication seamlessly.
 */
export function setupFetchPatch() {
  const originalFetch = window.fetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = localStorage.getItem('quillhive_token');
    
    // Only patch if we have a token and the URL is an API call
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    
    if (token && urlStr.includes('/api/')) {
      init = init || {};
      init.headers = {
        ...init.headers,
        Authorization: `Bearer ${token}`
      };
    }
    
    return originalFetch(input, init);
  };
}
