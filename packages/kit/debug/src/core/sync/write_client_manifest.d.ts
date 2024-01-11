/**
 * Writes the client manifest to disk. The manifest is used to power the router. It contains the
 * list of routes and corresponding Svelte components (i.e. pages and layouts).
 * @param {import('../../types/internal.d.ts').ValidatedKitConfig} kit
 * @param {import('../../types/internal.d.ts').ManifestData} manifest_data
 * @param {string} output
 * @param {Array<{ has_server_load: boolean }>} [metadata]
 */
export function write_client_manifest(kit: import('../../types/internal.d.ts').ValidatedKitConfig, manifest_data: import('../../types/internal.d.ts').ManifestData, output: string, metadata?: {
    has_server_load: boolean;
}[] | undefined): void;
//# sourceMappingURL=write_client_manifest.d.ts.map