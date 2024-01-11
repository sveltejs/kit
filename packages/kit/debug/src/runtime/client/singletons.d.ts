/// <reference types="svelte" />
/**
 * @param {{
 *   client: import('./types.js').Client;
 * }} opts
 */
export function init(opts: {
    client: import('./types.js').Client;
}): void;
/**
 * @template {keyof typeof client} T
 * @param {T} key
 * @returns {typeof client[T]}
 */
export function client_method<T extends keyof import("./types.js").Client>(key: T): import("./types.js").Client[T];
/** @type {import('./types.js').Client} */
export let client: import('./types.js').Client;
export namespace stores {
    let url: {
        notify: () => void;
        set: (new_value: any) => void;
        subscribe: (run: (value: any) => void) => import("svelte/store").Unsubscriber;
    };
    let page: {
        notify: () => void;
        set: (new_value: any) => void;
        subscribe: (run: (value: any) => void) => import("svelte/store").Unsubscriber;
    };
    let navigating: import("svelte/store").Writable<import("@sveltejs/kit").Navigation | null>;
    let updated: {
        subscribe: (this: void, run: import("svelte/store").Subscriber<boolean>, invalidate?: import("svelte/store").Invalidator<boolean> | undefined) => import("svelte/store").Unsubscriber;
        check: () => Promise<boolean>;
    };
}
//# sourceMappingURL=singletons.d.ts.map