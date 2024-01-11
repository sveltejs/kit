export function getStores(): {
    /** @type {typeof page} */
    page: typeof page;
    /** @type {typeof navigating} */
    navigating: typeof navigating;
    /** @type {typeof updated} */
    updated: typeof updated;
};
/**
 * A readable store whose value contains page data.
 *
 * On the server, this store can only be subscribed to during component initialization. In the browser, it can be subscribed to at any time.
 *
 * @type {import('svelte/store').Readable<import('@sveltejs/kit').Page>}
 */
export const page: import('svelte/store').Readable<import('@sveltejs/kit').Page>;
/**
 * A readable store.
 * When navigating starts, its value is a `Navigation` object with `from`, `to`, `type` and (if `type === 'popstate'`) `delta` properties.
 * When navigating finishes, its value reverts to `null`.
 *
 * On the server, this store can only be subscribed to during component initialization. In the browser, it can be subscribed to at any time.
 * @type {import('svelte/store').Readable<import('@sveltejs/kit').Navigation | null>}
 */
export const navigating: import('svelte/store').Readable<import('@sveltejs/kit').Navigation | null>;
/**
 * A readable store whose initial value is `false`. If [`version.pollInterval`](https://kit.svelte.dev/docs/configuration#version) is a non-zero value, SvelteKit will poll for new versions of the app and update the store value to `true` when it detects one. `updated.check()` will force an immediate check, regardless of polling.
 *
 * On the server, this store can only be subscribed to during component initialization. In the browser, it can be subscribed to at any time.
 * @type {import('svelte/store').Readable<boolean> & { check(): Promise<boolean> }}
 */
export const updated: import('svelte/store').Readable<boolean> & {
    check(): Promise<boolean>;
};
//# sourceMappingURL=stores.d.ts.map