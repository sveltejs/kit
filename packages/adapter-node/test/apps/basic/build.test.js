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

test('does not copy public assets into the server output', () => {
	const files = fs.readdirSync(path.join(app, 'build/client/_app/immutable/assets'));
	expect(files.some((file) => file.startsWith('image.'))).toBe(true);
	expect(files.some((file) => file.startsWith('server-only.'))).toBe(true);
	const server_files = fs.readdirSync(path.join(app, 'build/server/_app/immutable/assets'));
	// Unlike URL imports, WebAssembly initializers need their files on the server.
	expect(server_files).toEqual(files.filter((file) => file.endsWith('.wasm')));
	expect(server_files).toHaveLength(1);
	expect(fs.existsSync(path.join(app, 'build/server/_app/immutable/workers'))).toBe(false);
});

test('loads emitted WebAssembly from the server filesystem', async () => {
	const { GET } = await import(path.join(app, 'build/server/entries/endpoints/wasm/_server.js'));
	expect(await (await GET()).json()).toEqual([]);
});
