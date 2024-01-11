/**
 * @param {string} base
 * @param {string} path
 */
export function resolve(base: string, path: string): string;
/** @param {string} path */
export function is_root_relative(path: string): boolean;
/**
 * @param {string} path
 * @param {import('../types/internal.d.ts').TrailingSlash} trailing_slash
 */
export function normalize_path(path: string, trailing_slash: import('../types/internal.d.ts').TrailingSlash): string;
/**
 * Decode pathname excluding %25 to prevent further double decoding of params
 * @param {string} pathname
 */
export function decode_pathname(pathname: string): string;
/** @param {Record<string, string>} params */
export function decode_params(params: Record<string, string>): Record<string, string>;
/**
 * The error when a URL is malformed is not very helpful, so we augment it with the URI
 * @param {string} uri
 */
export function decode_uri(uri: string): string;
/**
 * Returns everything up to the first `#` in a URL
 * @param {{href: string}} url_like
 */
export function strip_hash({ href }: {
    href: string;
}): string;
/**
 * @param {URL} url
 * @param {() => void} callback
 * @param {(search_param: string) => void} search_params_callback
 */
export function make_trackable(url: URL, callback: () => void, search_params_callback: (search_param: string) => void): URL;
/**
 * Disallow access to `url.hash` on the server and in `load`
 * @param {URL} url
 */
export function disable_hash(url: URL): void;
/**
 * Disallow access to `url.search` and `url.searchParams` during prerendering
 * @param {URL} url
 */
export function disable_search(url: URL): void;
/** @param {string} pathname */
export function has_data_suffix(pathname: string): boolean;
/** @param {string} pathname */
export function add_data_suffix(pathname: string): string;
/** @param {string} pathname */
export function strip_data_suffix(pathname: string): string;
/**
 * Matches a URI scheme. See https://www.rfc-editor.org/rfc/rfc3986#section-3.1
 * @type {RegExp}
 */
export const SCHEME: RegExp;
//# sourceMappingURL=url.d.ts.map