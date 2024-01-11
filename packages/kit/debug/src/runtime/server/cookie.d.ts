/**
 * @param {Request} request
 * @param {URL} url
 * @param {import('../../types/internal.d.ts').TrailingSlash} trailing_slash
 */
export function get_cookies(request: Request, url: URL, trailing_slash: import('../../types/internal.d.ts').TrailingSlash): {
    cookies: import("@sveltejs/kit").Cookies;
    new_cookies: Record<string, import("./page/types.js").Cookie>;
    get_cookie_header: (destination: URL, header: string | null) => string;
    set_internal: (name: string, value: string, options: import('./page/types.js').Cookie['options']) => void;
};
/**
 * @param {string} hostname
 * @param {string} [constraint]
 */
export function domain_matches(hostname: string, constraint?: string | undefined): boolean;
/**
 * @param {string} path
 * @param {string} [constraint]
 */
export function path_matches(path: string, constraint?: string | undefined): boolean;
/**
 * @param {Headers} headers
 * @param {import('./page/types.js').Cookie[]} cookies
 */
export function add_cookies_to_headers(headers: Headers, cookies: import('./page/types.js').Cookie[]): void;
//# sourceMappingURL=cookie.d.ts.map