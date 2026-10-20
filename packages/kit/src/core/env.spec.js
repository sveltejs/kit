/** @import { ViteDevServer } from 'vite' */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { process_config, validate_config } from './config/index.js';
import { load_explicit_env } from './env.js';

/** what each server created by `load_explicit_env` was watching when it was closed */
const watched = vi.hoisted(() => /** @type {Array<Record<string, string[]>>} */ ([]));

vi.mock(import('../utils/import.js'), async (original) => {
	const { import_peer } = await original();

	return {
		import_peer: async (dependency, root) => {
			const module = await import_peer(dependency, root);
			if (dependency !== 'vite') return module;

			return {
				...module,
				/** @param {import('vite').InlineConfig} config */
				createServer: async (config) => {
					const server = /** @type {ViteDevServer} */ (await module.createServer(config));
					const close = server.close;

					server.close = () => {
						watched.push(server.watcher.getWatched());
						return close.call(server);
					};

					return server;
				}
			};
		}
	};
});

test('loads src/env without watching the file system', async () => {
	const root = path.resolve(import.meta.dirname, '../../test/apps/basics');
	const dir = fs.mkdtempSync(path.join(root, 'node_modules/.svelte-kit-env-'));
	const entry = path.join(dir, 'env.ts');

	fs.writeFileSync(
		entry,
		`import { defineEnvVars } from '@sveltejs/kit/env';
export const variables = defineEnvVars({ FOO: {} });
`
	);

	try {
		const config = process_config(validate_config({}), root);
		const { variables } = await load_explicit_env(config, entry, root, 'development');

		expect(Object.keys(variables ?? {})).toEqual(['FOO']);

		// the server is closed once `src/env` is imported, and the caller's own
		// server watches `deps`, so a watcher here would only crawl the project
		expect(watched).toEqual([{}]);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});
