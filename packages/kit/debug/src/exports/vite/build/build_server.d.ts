/**
 * @param {string} out
 * @param {import('../../../types/internal.d.ts').ValidatedKitConfig} kit
 * @param {import('../../../types/internal.d.ts').ManifestData} manifest_data
 * @param {import('vite').Manifest} server_manifest
 * @param {import('vite').Manifest | null} client_manifest
 * @param {import('vite').Rollup.OutputAsset[] | null} css
 */
export function build_server_nodes(out: string, kit: import('../../../types/internal.d.ts').ValidatedKitConfig, manifest_data: import('../../../types/internal.d.ts').ManifestData, server_manifest: import('vite').Manifest, client_manifest: import('vite').Manifest | null, css: import('vite').Rollup.OutputAsset[] | null): void;
//# sourceMappingURL=build_server.d.ts.map