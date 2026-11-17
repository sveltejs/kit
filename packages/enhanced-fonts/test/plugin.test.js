import { describe, expect, test, vi } from 'vitest';
import { enhancedFonts } from '../src/index.js';

describe('vite plugin', () => {
	test('enhancedFonts() is a vite plugin (after sveltekit() in user config)', () => {
		const plugin = enhancedFonts({ families: [] });
		expect(plugin.name).toBe('vite-plugin-enhanced-fonts');
	});

	test('warns when registered before sveltekit()', () => {
		const plugin = enhancedFonts({ families: [] });
		const warn = vi.fn();
		call_hook(
			plugin.configResolved,
			/** @type {import('vite').ResolvedConfig} */ (
				/** @type {unknown} */ ({
					command: 'build',
					build: { assetsDir: '_app/immutable', ssr: false },
					plugins: [
						{ name: 'vite-plugin-enhanced-fonts' },
						{ name: 'vite-plugin-sveltekit-setup' }
					],
					logger: { warn }
				})
			)
		);
		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/after sveltekit\(\)/));
	});

	test('does not warn when registered after sveltekit()', () => {
		const plugin = enhancedFonts({ families: [] });
		const warn = vi.fn();
		call_hook(
			plugin.configResolved,
			/** @type {import('vite').ResolvedConfig} */ (
				/** @type {unknown} */ ({
					command: 'build',
					build: { assetsDir: '_app/immutable', ssr: false },
					plugins: [
						{ name: 'vite-plugin-sveltekit-setup' },
						{ name: 'vite-plugin-enhanced-fonts' }
					],
					logger: { warn }
				})
			)
		);
		expect(warn).not.toHaveBeenCalled();
	});
});

/**
 * @param {import('vite').Plugin['configResolved']} hook
 * @param {import('vite').ResolvedConfig} config
 */
function call_hook(hook, config) {
	if (!hook) throw new Error('missing hook');
	const fn = typeof hook === 'function' ? hook : hook.handler;
	void fn.call(/** @type {any} */ ({}), config);
}
