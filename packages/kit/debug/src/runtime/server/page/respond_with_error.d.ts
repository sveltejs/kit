/**
 * @typedef {import('./types.js').Loaded} Loaded
 */
/**
 * @param {{
 *   event: import('@sveltejs/kit').RequestEvent;
 *   options: import('../../../types/internal.d.ts').SSROptions;
 *   manifest: import('@sveltejs/kit').SSRManifest;
 *   state: import('../../../types/internal.d.ts').SSRState;
 *   status: number;
 *   error: unknown;
 *   resolve_opts: import('../../../types/internal.d.ts').RequiredResolveOptions;
 * }} opts
 */
export function respond_with_error({ event, options, manifest, state, status, error, resolve_opts }: {
    event: import('@sveltejs/kit').RequestEvent;
    options: import('../../../types/internal.d.ts').SSROptions;
    manifest: import('@sveltejs/kit').SSRManifest;
    state: import('../../../types/internal.d.ts').SSRState;
    status: number;
    error: unknown;
    resolve_opts: import('../../../types/internal.d.ts').RequiredResolveOptions;
}): Promise<Response>;
export type Loaded = import('./types.js').Loaded;
//# sourceMappingURL=respond_with_error.d.ts.map