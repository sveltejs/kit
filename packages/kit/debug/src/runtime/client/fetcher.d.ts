export function lock_fetch(): void;
export function unlock_fetch(): void;
/**
 * Should be called on the initial run of load functions that hydrate the page.
 * Saves any requests with cache-control max-age to the cache.
 * @param {URL | string} resource
 * @param {RequestInit} [opts]
 */
export function initial_fetch(resource: URL | string, opts?: RequestInit | undefined): Promise<Response>;
/**
 * Tries to get the response from the cache, if max-age allows it, else does a fetch.
 * @param {URL | string} resource
 * @param {string} resolved
 * @param {RequestInit} [opts]
 */
export function subsequent_fetch(resource: URL | string, resolved: string, opts?: RequestInit | undefined): Response | Promise<Response>;
export const native_fetch: ((input: RequestInfo | URL, init?: RequestInit | undefined) => Promise<Response>) & typeof fetch;
//# sourceMappingURL=fetcher.d.ts.map