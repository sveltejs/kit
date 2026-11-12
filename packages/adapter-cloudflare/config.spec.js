import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { resolveConfig } from 'vite';
import { plugin_config } from './config.js';

/**
 * Resolves the Vite config of a project with the given `cloudflare.config.ts` contents
 * @param {string} cloudflare_config
 * @param {(config: import('@cloudflare/vite-plugin').CloudflareConfig) => void} set_config
 * @param {string} [mode]
 * @param {(entrypoint: string | undefined) => void} [set_custom_entrypoint]
 */
async function resolve(cloudflare_config, set_config, mode, set_custom_entrypoint = () => {}) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-cloudflare-config-'));
	try {
		fs.writeFileSync(path.join(root, 'cloudflare.config.ts'), cloudflare_config);
		return await resolveConfig(
			{
				root,
				mode,
				configFile: false,
				logLevel: 'silent',
				plugins: plugin_config({
					set_config,
					set_custom_entrypoint,
					set_forward: () => {}
				})
			},
			'build'
		);
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
}

test('evaluates cloudflare.config.ts with the Vite mode and adds the `ASSETS` binding and the `nodejs_als` flag', async () => {
	const set_config = vi.fn();
	await resolve(
		`export default ({ mode }) => ({
			worker: {
				name: 'app',
				compatibilityDate: '2026-09-01',
				env: { FOO: { type: 'text', value: mode } }
			}
		});`,
		set_config,
		'staging'
	);

	expect(set_config).toHaveBeenCalledWith(
		expect.objectContaining({
			worker: expect.objectContaining({
				compatibilityFlags: ['nodejs_als'],
				env: { FOO: { type: 'text', value: 'staging' }, ASSETS: { type: 'assets' } }
			})
		})
	);
});

test('keeps an assets binding with a custom name', async () => {
	const set_config = vi.fn();
	await resolve(
		`export default {
			worker: {
				name: 'app',
				compatibilityDate: '2026-09-01',
				env: { STATIC: { type: 'assets' } }
			}
		};`,
		set_config
	);

	expect(set_config).toHaveBeenCalledWith(
		expect.objectContaining({
			worker: expect.objectContaining({ env: { STATIC: { type: 'assets' } } })
		})
	);
});

test('throws when the Worker entrypoint is the old generated Worker', async () => {
	await expect(
		resolve(
			`export default {
				worker: {
					name: 'app',
					compatibilityDate: '2026-09-01',
					entrypoint: '.svelte-kit/cloudflare/_worker.js'
				}
			};`,
			() => {}
		)
	).rejects.toThrow('Remove the Worker `entrypoint`');
});

test('uses a custom Worker entrypoint and stands in for it in the SSR environment', async () => {
	const set_config = vi.fn();
	const set_custom_entrypoint = vi.fn();
	await resolve(
		`export default {
			worker: {
				name: 'app',
				compatibilityDate: '2026-09-01',
				entrypoint: 'src/worker.js'
			}
		};`,
		set_config,
		undefined,
		set_custom_entrypoint
	);

	expect(set_custom_entrypoint).toHaveBeenCalledWith('src/worker.js');
	expect(set_config).toHaveBeenCalledWith(
		expect.objectContaining({
			worker: expect.objectContaining({
				entrypoint: expect.stringMatching(/files[\\/]worker\.js$/)
			})
		})
	);
});

test('rejects `assets.basePath`, which conflicts with `paths.base`', async () => {
	await expect(
		resolve(
			`export default {
				worker: {
					name: 'app',
					compatibilityDate: '2026-09-01',
					assets: { basePath: '/base' }
				}
			};`,
			() => {}
		)
	).rejects.toThrow('Remove `assets.basePath` from cloudflare.config.ts');
});
