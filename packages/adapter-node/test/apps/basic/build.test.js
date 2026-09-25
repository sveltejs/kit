import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => vi.unstubAllEnvs());

test('exports the handler', async () => {
	vi.stubEnv('MY_CUSTOM_PORT', '5173');
	vi.stubEnv('INSTRUMENTATION_ENV', 'available');
	const { handler } = await import('./build/handler.js');
	expect(handler).toBeDefined();
});

test('framework dependencies are bundled when listed as production dependencies', async () => {
	vi.stubEnv('MY_CUSTOM_PORT', '5173');
	vi.stubEnv('INSTRUMENTATION_ENV', 'available');
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-node-'));

	try {
		fs.cpSync(path.resolve(import.meta.dirname, 'build'), directory, { recursive: true });
		await expect(
			import(pathToFileURL(path.join(directory, 'handler.js')).href)
		).resolves.toBeDefined();
	} finally {
		fs.rmSync(directory, { recursive: true });
	}
});

test('Kit imports remain bundled in lazy route chunks', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-node-'));

	try {
		fs.cpSync(path.resolve(import.meta.dirname, 'build'), directory, { recursive: true });
		const endpoint = path.join(
			directory,
			'server/entries/endpoints/instrumentation-env/_server.js'
		);
		const { GET } = await import(pathToFileURL(endpoint).href);
		expect(await GET().text()).toBe('{}');
	} finally {
		fs.rmSync(directory, { recursive: true });
	}
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
