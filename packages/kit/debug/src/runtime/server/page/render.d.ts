/**
 * Creates the HTML response.
 * @param {{
 *   branch: Array<import('./types.js').Loaded>;
 *   fetched: Array<import('./types.js').Fetched>;
 *   options: import('../../../types/internal.d.ts').SSROptions;
 *   manifest: import('@sveltejs/kit').SSRManifest;
 *   state: import('../../../types/internal.d.ts').SSRState;
 *   page_config: { ssr: boolean; csr: boolean };
 *   status: number;
 *   error: App.Error | null;
 *   event: import('@sveltejs/kit').RequestEvent;
 *   resolve_opts: import('../../../types/internal.d.ts').RequiredResolveOptions;
 *   action_result?: import('@sveltejs/kit').ActionResult;
 * }} opts
 */
export function render_response({ branch, fetched, options, manifest, state, page_config, status, error, event, resolve_opts, action_result }: {
    branch: Array<import('./types.js').Loaded>;
    fetched: Array<import('./types.js').Fetched>;
    options: import('../../../types/internal.d.ts').SSROptions;
    manifest: import('@sveltejs/kit').SSRManifest;
    state: import('../../../types/internal.d.ts').SSRState;
    page_config: {
        ssr: boolean;
        csr: boolean;
    };
    status: number;
    error: App.Error | null;
    event: import('@sveltejs/kit').RequestEvent;
    resolve_opts: import('../../../types/internal.d.ts').RequiredResolveOptions;
    action_result?: import('@sveltejs/kit').ActionResult;
}): Promise<Response>;
//# sourceMappingURL=render.d.ts.map