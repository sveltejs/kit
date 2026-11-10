/** @import { Plugin } from 'vite' */
import { expect, test } from 'vitest';
import adapter from './index.js';

/**
 * @param {import('@sveltejs/kit').Adapter} [instance]
 * @param {string} [assets]
 */
function get_vite_config(instance = adapter(), assets = '') {
	if (typeof instance.vite !== 'function') throw new Error('Expected an adapter config function');
	return /** @type {{ plugins: Plugin[] }} */ (
		instance.vite({
			config: /** @type {Parameters<typeof instance.vite>[0]['config']} */ ({
				paths: { assets },
				files: {
					src: 'src',
					routes: 'src/routes',
					params: 'src/params',
					hooks: { server: 'src/hooks.server', universal: 'src/hooks' }
				}
			})
		})
	);
}

test.each(['https://cdn.example.com', '/assets'])(
	'rejects paths.assets=%s when configuring the adapter',
	(assets) => {
		expect(() => get_vite_config(adapter(), assets)).toThrow(
			'@sveltejs/adapter-cloudflare does not support paths.assets'
		);
	}
);

test('rejects the removed `platformProxy` option', () => {
	expect(() => adapter(/** @type {any} */ ({ platformProxy: {} }))).toThrow(
		'The adapter `platformProxy` option has been removed'
	);
});
