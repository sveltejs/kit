/**
 * Adds transitive JS and CSS dependencies to the js and css inputs.
 * @param {import('vite').Manifest} manifest
 * @param {string} entry
 * @param {boolean} add_dynamic_css
 * @returns {import('../../../types/internal.d.ts').AssetDependencies}
 */
export function find_deps(manifest: import('vite').Manifest, entry: string, add_dynamic_css: boolean): import('../../../types/internal.d.ts').AssetDependencies;
/**
 * @param {import('vite').Manifest} manifest
 * @param {string} file
 */
export function resolve_symlinks(manifest: import('vite').Manifest, file: string): {
    chunk: import("vite").ManifestChunk;
    file: string;
};
/**
 * @param {string} str
 * @returns {str is import('../../../types/internal.d.ts').HttpMethod}
 */
export function is_http_method(str: string): str is import("../../../types/private.js").HttpMethod;
/**
 * @param {import('../../../types/internal.d.ts').ValidatedKitConfig} config
 * @returns {string}
 */
export function assets_base(config: import('../../../types/internal.d.ts').ValidatedKitConfig): string;
//# sourceMappingURL=utils.d.ts.map