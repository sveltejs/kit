import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { resolveConfig } from 'vite';
import { plugin_config } from './config.js';

test('resolves a relative wrangler config path against the working directory', async () => {
	// a Vite root that differs from the working directory
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-cloudflare-'));

	try {
		// `@cloudflare/vite-plugin` throws if it can't find the config file, which happens
		// if the relative path is resolved against the Vite root instead of the working directory
		await expect(
			resolveConfig(
				{
					root,
					configFile: false,
					logLevel: 'silent',
					plugins: plugin_config('test/apps/workers/config/wrangler.jsonc')
				},
				'build'
			)
		).resolves.toBeDefined();
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});
