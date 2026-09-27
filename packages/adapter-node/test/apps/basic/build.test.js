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

const build = path.resolve(import.meta.dirname, 'build');

function server_source() {
	return fs
		.readdirSync(build, { encoding: 'utf8', recursive: true })
		.filter((file) => file.endsWith('.js'))
		.map((file) => fs.readFileSync(path.join(build, file), 'utf8'))
		.join('\n');
}

test('dependencies are not bundled', () => {
	expect(server_source()).not.toContain('server-side-dep implementation');
});

test('Svelte dependencies are bundled', () => {
	expect(server_source()).toContain('server-side Svelte dependency');
});
