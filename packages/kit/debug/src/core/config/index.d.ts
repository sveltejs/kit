/**
 * Loads the template (src/app.html by default) and validates that it has the
 * required content.
 * @param {string} cwd
 * @param {import('../../types/internal.d.ts').ValidatedConfig} config
 */
export function load_template(cwd: string, { kit }: import('../../types/internal.d.ts').ValidatedConfig): string;
/**
 * Loads the error page (src/error.html by default) if it exists.
 * Falls back to a generic error page content.
 * @param {import('../../types/internal.d.ts').ValidatedConfig} config
 */
export function load_error_page(config: import('../../types/internal.d.ts').ValidatedConfig): string;
/**
 * Loads and validates svelte.config.js
 * @param {{ cwd?: string }} options
 * @returns {Promise<import('../../types/internal.d.ts').ValidatedConfig>}
 */
export function load_config({ cwd }?: {
    cwd?: string;
}): Promise<import('../../types/internal.d.ts').ValidatedConfig>;
/**
 * @param {import('@sveltejs/kit').Config} config
 * @returns {import('../../types/internal.d.ts').ValidatedConfig}
 */
export function validate_config(config: import('@sveltejs/kit').Config): import('../../types/internal.d.ts').ValidatedConfig;
//# sourceMappingURL=index.d.ts.map