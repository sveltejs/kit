import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { resolveConfig } from 'vite';
import { plugin_config } from './config.js';

test('resolves a relative wrangler config path against the Vite root', async () => {
	// a Vite root that differs from the working directory
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-cloudflare-'));
	fs.mkdirSync(path.join(root, 'config'));
	fs.writeFileSync(
		path.join(root, 'config/wrangler.jsonc'),
		JSON.stringify({ name: 'test', compatibility_date: '2025-01-01' })
	);

	try {
		// `@cloudflare/vite-plugin` throws if it can't find the config file
		await expect(
			resolveConfig(
				{
					root,
					configFile: false,
					logLevel: 'silent',
					plugins: plugin_config('config/wrangler.jsonc')
				},
				'build'
			)
		).resolves.toBeDefined();
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});
