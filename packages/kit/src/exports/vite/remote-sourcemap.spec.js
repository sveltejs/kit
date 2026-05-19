import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const async_app_root = path.resolve(__dirname, '../../../test/apps/async');
const helper_script = path.resolve(__dirname, 'remote-sourcemap-test-helper.js');

describe('remote file SSR transform sourcemap', () => {
	test('transform of .remote file in SSR mode returns a sourcemap with correct source reference', () => {
		const id = 'src/routes/remote/query-command.remote.js';

		const result = execSync(`node ${helper_script} ${id}`, {
			cwd: async_app_root,
			encoding: 'utf-8',
			timeout: 30000,
			stdio: ['pipe', 'pipe', 'pipe']
		}).trim();

		const output = JSON.parse(result);

		// The transform must return a sourcemap (not just a plain string)
		expect(output.hasMap).toBe(true);

		// The sourcemap sources should reference the original .remote file with its full path
		expect(output.sources).toBeDefined();
		expect(output.sources.length).toBeGreaterThan(0);
		expect(
			output.sources.some((/** @type {string} */ s) =>
				s.includes('src/routes/remote/query-command.remote')
			)
		).toBe(true);

		// The sourcemap should have non-empty mappings
		expect(output.hasMappings).toBe(true);
	});
});
