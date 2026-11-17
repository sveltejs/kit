import fs from 'node:fs';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { deploy, leaked_imports } from '../../../../../test-utils/deploy.vitest.js';

const app = deploy(import.meta.dirname, {
	MY_CUSTOM_PORT: '5173',
	INSTRUMENTATION_ENV: 'available'
});

afterEach(() => vi.unstubAllEnvs());

test('exports the handler', async () => {
	vi.stubEnv('MY_CUSTOM_PORT', '5173');
	vi.stubEnv('INSTRUMENTATION_ENV', 'available');
	const { handler } = await import(path.join(app, 'build/handler.js'));
	expect(handler).toBeDefined();
});

test('dependencies are not bundled', () => {
	const dir = path.join(app, 'build');
	const marker = 'server-side-dep implementation';
	for (const file of fs.readdirSync(dir, { encoding: 'utf8', recursive: true })) {
		if (file.endsWith('.js')) {
			expect(fs.readFileSync(path.join(dir, file), 'utf8')).not.toContain(marker);
		}
	}
});

test('everything else is bundled', () => {
	expect(leaked_imports(app, 'build')).toEqual([]);
});

test('server-only assets ship with the server, and are not public', () => {
	const build = path.join(app, 'build');
	expect(fs.readFileSync(path.join(build, 'server/server-only/data.txt'), 'utf8')).toBe(
		'server-only data'
	);
	const client = fs.readdirSync(path.join(build, 'client'), { recursive: true, encoding: 'utf8' });
	expect(client.some((file) => file.endsWith('data.txt'))).toBe(false);
});
