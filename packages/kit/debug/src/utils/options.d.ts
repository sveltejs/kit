/**
 * @template {'prerender' | 'ssr' | 'csr' | 'trailingSlash' | 'entries'} Option
 * @template {(import('types').SSRNode['universal'] | import('types').SSRNode['server'])[Option]} Value
 *
 * @param {Array<import('../types/internal.d.ts').SSRNode | undefined>} nodes
 * @param {Option} option
 *
 * @returns {Value | undefined}
 */
export function get_option<Option extends "entries" | "prerender" | "ssr" | "csr" | "trailingSlash", Value extends ({
    load?: import("../exports/public.js").Load | undefined;
    prerender?: import("types").PrerenderOption | undefined;
    ssr?: boolean | undefined;
    csr?: boolean | undefined;
    trailingSlash?: import("types").TrailingSlash | undefined;
    config?: any;
    entries?: import("types").PrerenderEntryGenerator | undefined;
} | {
    load?: import("../exports/public.js").ServerLoad | undefined;
    prerender?: import("types").PrerenderOption | undefined;
    ssr?: boolean | undefined;
    csr?: boolean | undefined;
    trailingSlash?: import("types").TrailingSlash | undefined;
    actions?: import("../exports/public.js").Actions | undefined;
    config?: any;
    entries?: import("types").PrerenderEntryGenerator | undefined;
})[Option]>(nodes: Array<import('../types/internal.d.ts').SSRNode | undefined>, option: Option): Value | undefined;
//# sourceMappingURL=options.d.ts.map