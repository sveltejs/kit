import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { resolveConfig } from 'vite';
import { plugin_config } from './config.js';

test('selects Wrangler configuration and named environments from Vite env files', async () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-cloudflare-env-'));
	try {
		vi.stubEnv('CLOUDFLARE_ENV', undefined);
		vi.stubEnv('CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH', undefined);
		fs.writeFileSync(
			path.join(root, '.env.production'),
			'CLOUDFLARE_ENV=staging\nCLOUDFLARE_VITE_WRANGLER_CONFIG_PATH=config/wrangler.jsonc\n'
		);
		fs.mkdirSync(path.join(root, 'config'));
		fs.writeFileSync(
			path.join(root, 'config/wrangler.jsonc'),
			JSON.stringify({
				compatibility_date: '2026-09-01',
				vars: { FOO: 'default' },
				env: { staging: { vars: { FOO: 'staging' } } }
			})
		);
		const set_worker_config = vi.fn();
		await resolveConfig(
			{
				root,
				mode: 'production',
				configFile: false,
				logLevel: 'silent',
				plugins: plugin_config(undefined, set_worker_config)
			},
			'build'
		);
		expect(set_worker_config).toHaveBeenCalledWith(
			expect.objectContaining({ vars: { FOO: 'staging' } })
		);
	} finally {
		vi.unstubAllEnvs();
		fs.rmSync(root, { recursive: true, force: true });
	}
});

test('resolves a relative wrangler config path against the Vite root', async () => {
	// `@cloudflare/vite-plugin` throws if it can't find the config file, which happens
	// if the relative path is resolved against the working directory instead of the Vite root
	await expect(
		resolveConfig(
			{
				root: path.resolve('test/apps/workers'),
				configFile: false,
				logLevel: 'silent',
				plugins: plugin_config('config/wrangler.jsonc', () => {})
			},
			'build'
		)
	).resolves.toBeDefined();
});

test.each([
	['.svelte-kit/cloudflare/_worker.js', 'throws'],
	['src/worker.js', 'warns']
])('validates `main` %s in the Wrangler config', async (main, outcome) => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-cloudflare-main-'));
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	try {
		fs.writeFileSync(
			path.join(root, 'wrangler.jsonc'),
			JSON.stringify({ compatibility_date: '2026-09-01', main })
		);
		const resolving = resolveConfig(
			{
				root,
				configFile: false,
				logLevel: 'silent',
				plugins: plugin_config(undefined, () => {})
			},
			'build'
		);

		if (outcome === 'throws') {
			await expect(resolving).rejects.toThrow('Remove `main`');
		} else {
			await resolving;
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('Ignoring `main`'));
		}
	} finally {
		warn.mockRestore();
		fs.rmSync(root, { recursive: true, force: true });
	}
});
