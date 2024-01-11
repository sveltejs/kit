/**
 * @param {{
 *   event: import('@sveltejs/kit').RequestEvent;
 *   options: import('../../types/internal.d.ts').SSROptions;
 *   manifest: import('@sveltejs/kit').SSRManifest;
 *   state: import('../../types/internal.d.ts').SSRState;
 *   get_cookie_header: (url: URL, header: string | null) => string;
 *   set_internal: (name: string, value: string, opts: import('./page/types.js').Cookie['options']) => void;
 * }} opts
 * @returns {typeof fetch}
 */
export function create_fetch({ event, options, manifest, state, get_cookie_header, set_internal }: {
    event: import('@sveltejs/kit').RequestEvent;
    options: import('../../types/internal.d.ts').SSROptions;
    manifest: import('@sveltejs/kit').SSRManifest;
    state: import('../../types/internal.d.ts').SSRState;
    get_cookie_header: (url: URL, header: string | null) => string;
    set_internal: (name: string, value: string, opts: import('./page/types.js').Cookie['options']) => void;
}): typeof fetch;
//# sourceMappingURL=fetch.d.ts.map