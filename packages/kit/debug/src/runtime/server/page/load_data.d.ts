/**
 * Calls the user's server `load` function.
 * @param {{
 *   event: import('@sveltejs/kit').RequestEvent;
 *   state: import('../../../types/internal.d.ts').SSRState;
 *   node: import('../../../types/internal.d.ts').SSRNode | undefined;
 *   parent: () => Promise<Record<string, any>>;
 * }} opts
 * @returns {Promise<import('../../../types/internal.d.ts').ServerDataNode | null>}
 */
export function load_server_data({ event, state, node, parent }: {
    event: import('@sveltejs/kit').RequestEvent;
    state: import('../../../types/internal.d.ts').SSRState;
    node: import('../../../types/internal.d.ts').SSRNode | undefined;
    parent: () => Promise<Record<string, any>>;
}): Promise<import('../../../types/internal.d.ts').ServerDataNode | null>;
/**
 * Calls the user's `load` function.
 * @param {{
 *   event: import('@sveltejs/kit').RequestEvent;
 *   fetched: import('./types.js').Fetched[];
 *   node: import('../../../types/internal.d.ts').SSRNode | undefined;
 *   parent: () => Promise<Record<string, any>>;
 *   resolve_opts: import('../../../types/internal.d.ts').RequiredResolveOptions;
 *   server_data_promise: Promise<import('../../../types/internal.d.ts').ServerDataNode | null>;
 *   state: import('../../../types/internal.d.ts').SSRState;
 *   csr: boolean;
 * }} opts
 * @returns {Promise<Record<string, any | Promise<any>> | null>}
 */
export function load_data({ event, fetched, node, parent, server_data_promise, state, resolve_opts, csr }: {
    event: import('@sveltejs/kit').RequestEvent;
    fetched: import('./types.js').Fetched[];
    node: import('../../../types/internal.d.ts').SSRNode | undefined;
    parent: () => Promise<Record<string, any>>;
    resolve_opts: import('../../../types/internal.d.ts').RequiredResolveOptions;
    server_data_promise: Promise<import('../../../types/internal.d.ts').ServerDataNode | null>;
    state: import('../../../types/internal.d.ts').SSRState;
    csr: boolean;
}): Promise<Record<string, any | Promise<any>> | null>;
/**
 * @param {Pick<import('@sveltejs/kit').RequestEvent, 'fetch' | 'url' | 'request' | 'route'>} event
 * @param {import('../../../types/internal.d.ts').SSRState} state
 * @param {import('./types.js').Fetched[]} fetched
 * @param {boolean} csr
 * @param {Pick<Required<import('@sveltejs/kit').ResolveOptions>, 'filterSerializedResponseHeaders'>} resolve_opts
 * @returns {typeof fetch}
 */
export function create_universal_fetch(event: Pick<import('@sveltejs/kit').RequestEvent, 'fetch' | 'url' | 'request' | 'route'>, state: import('../../../types/internal.d.ts').SSRState, fetched: import('./types.js').Fetched[], csr: boolean, resolve_opts: Pick<Required<import('@sveltejs/kit').ResolveOptions>, 'filterSerializedResponseHeaders'>): typeof fetch;
//# sourceMappingURL=load_data.d.ts.map