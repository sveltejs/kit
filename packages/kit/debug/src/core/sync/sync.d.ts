/**
 * Initialize SvelteKit's generated files.
 * @param {import('../../types/internal.d.ts').ValidatedConfig} config
 * @param {string} mode
 */
export function init(config: import('../../types/internal.d.ts').ValidatedConfig, mode: string): void;
/**
 * Update SvelteKit's generated files
 * @param {import('../../types/internal.d.ts').ValidatedConfig} config
 */
export function create(config: import('../../types/internal.d.ts').ValidatedConfig): Promise<{
    manifest_data: import("../../types/internal.d.ts").ManifestData;
}>;
/**
 * Update SvelteKit's generated files in response to a single file content update.
 * Do not call this when the file in question was created/deleted.
 *
 * @param {import('../../types/internal.d.ts').ValidatedConfig} config
 * @param {import('../../types/internal.d.ts').ManifestData} manifest_data
 * @param {string} file
 */
export function update(config: import('../../types/internal.d.ts').ValidatedConfig, manifest_data: import('../../types/internal.d.ts').ManifestData, file: string): Promise<{
    manifest_data: import("../../types/internal.d.ts").ManifestData;
}>;
/**
 * Run sync.init and sync.create in series, returning the result from sync.create.
 * @param {import('../../types/internal.d.ts').ValidatedConfig} config
 * @param {string} mode The Vite mode
 */
export function all(config: import('../../types/internal.d.ts').ValidatedConfig, mode: string): Promise<{
    manifest_data: import("../../types/internal.d.ts").ManifestData;
}>;
/**
 * Run sync.init and then generate all type files.
 * @param {import('../../types/internal.d.ts').ValidatedConfig} config
 * @param {string} mode The Vite mode
 */
export function all_types(config: import('../../types/internal.d.ts').ValidatedConfig, mode: string): Promise<void>;
/**
 * Regenerate __SERVER__/internal.js in response to src/{app.html,error.html,service-worker.js} changing
 * @param {import('../../types/internal.d.ts').ValidatedConfig} config
 */
export function server(config: import('../../types/internal.d.ts').ValidatedConfig): void;
//# sourceMappingURL=sync.d.ts.map