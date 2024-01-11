/** @param {{ verbose: boolean }} opts */
export function logger({ verbose }: {
    verbose: boolean;
}): import("../types/private.js").Logger;
/** @param {import('../types/internal.d.ts').ManifestData} manifest_data */
export function get_mime_lookup(manifest_data: import('../types/internal.d.ts').ManifestData): Record<string, string>;
/**
 * @param {string} dir
 * @param {(file: string) => boolean} [filter]
 */
export function list_files(dir: string, filter?: ((file: string) => boolean) | undefined): string[];
/**
 * Resolved path of the `runtime` directory
 *
 * TODO Windows issue:
 * Vite or sth else somehow sets the driver letter inconsistently to lower or upper case depending on the run environment.
 * In playwright debug mode run through VS Code this a root-to-lowercase conversion is needed in order for the tests to run.
 * If we do this conversion in other cases it has the opposite effect though and fails.
 */
export const runtime_directory: string;
/**
 * This allows us to import SvelteKit internals that aren't exposed via `pkg.exports` in a
 * way that works whether `@sveltejs/kit` is installed inside the project's `node_modules`
 * or in a workspace root
 */
export const runtime_base: string;
//# sourceMappingURL=utils.d.ts.map