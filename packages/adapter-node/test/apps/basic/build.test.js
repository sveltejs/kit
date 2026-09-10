import fs from 'node:fs';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => vi.unstubAllEnvs());

test('exports the handler', async () => {
	vi.stubEnv('MY_CUSTOM_PORT', '5173');
	vi.stubEnv('INSTRUMENTATION_ENV', 'available');
	const { handler } = await import('./build/handler.js');
	expect(handler).toBeDefined();
});

test('dependencies are not bundled', () => {
	const build = path.resolve(import.meta.dirname, 'build');
	const marker = 'server-side-dep implementation';

	for (const file of fs.readdirSync(build, { encoding: 'utf8', recursive: true })) {
		if (file.endsWith('.js')) {
			expect(fs.readFileSync(path.join(build, file), 'utf8')).not.toContain(marker);
		}
	}
});
