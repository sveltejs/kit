import path from 'node:path';
import { expect, test } from 'vitest';
import { resolveConfig } from 'vite';
import { plugin_config } from './config.js';

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
