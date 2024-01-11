/**
 * @param {string} out
 * @param {import('../../../types/internal.d.ts').ValidatedKitConfig} kit
 * @param {import('vite').ResolvedConfig} vite_config
 * @param {import('../../../types/internal.d.ts').ManifestData} manifest_data
 * @param {string} service_worker_entry_file
 * @param {import('../../../types/internal.d.ts').Prerendered} prerendered
 * @param {import('vite').Manifest} client_manifest
 */
export function build_service_worker(out: string, kit: import('../../../types/internal.d.ts').ValidatedKitConfig, vite_config: import('vite').ResolvedConfig, manifest_data: import('../../../types/internal.d.ts').ManifestData, service_worker_entry_file: string, prerendered: import('../../../types/internal.d.ts').Prerendered, client_manifest: import('vite').Manifest): Promise<void>;
//# sourceMappingURL=build_service_worker.d.ts.map