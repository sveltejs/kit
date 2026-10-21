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
		const config = await resolveConfig(
			{
				root,
				configFile: false,
				logLevel: 'silent',
				plugins: plugin_config('test/apps/workers/config/wrangler.jsonc')
			},
			'build'
		);

		expect(config.environments.ssr.resolve.conditions).toContain('workerd');
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});
