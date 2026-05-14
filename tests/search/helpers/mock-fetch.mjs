let originalFetch = null;
let queue = [];

export function mockFetch(responses) {
  if (!originalFetch) originalFetch = globalThis.fetch;
  queue = Array.isArray(responses) ? [...responses] : [responses];
  globalThis.fetch = async (url, opts) => {
    const next = queue.shift();
    if (!next) throw new Error(`mock-fetch: no response queued for ${url}`);
    if (next.error) {
      const e = new Error(next.error);
      e.code = next.errorCode || 'NETWORK_ERROR';
      throw e;
    }
    return new Response(next.body, {
      status: next.status ?? 200,
      headers: next.headers ?? { 'Content-Type': 'text/html' },
    });
  };
}

export function restoreFetch() {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = null;
  }
  queue = [];
}

export function pendingResponses() {
  return queue.length;
}
