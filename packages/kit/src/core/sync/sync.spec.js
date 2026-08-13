import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { update } from './sync.js';

test('requests a manifest rebuild if static analysis encounters a missing route file', () => {
	const manifest_data = /** @type {import('types').ManifestData} */ ({
		assets: [],
		hooks: { client: null, server: null, universal: null },
		nodes: [{ depth: 0, server: 'missing/+page.server.js' }],
		params: null,
		routes: []
	});

	const updated = update(
		/** @type {import('types').ValidatedConfig} */ (/** @type {unknown} */ ({})),
		manifest_data,
		'missing/+page.server.js',
		import.meta.dirname
	);

	expect(updated).toBe(false);
});

test('requests a manifest rebuild if type generation encounters a missing route file', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svelte-kit-sync-'));
	const routes = path.join(root, 'src/routes');
	const server = 'src/routes/missing/+page.server.js';

	const config = /** @type {import('types').ValidatedConfig} */ (
		/** @type {unknown} */ ({
			files: { params: path.join(root, 'src/params'), routes },
			outDir: path.join(root, '.svelte-kit')
		})
	);
	const outdir = path.join(config.outDir, 'types', path.relative(root, routes), 'missing');
	fs.mkdirSync(outdir, { recursive: true });

	const leaf = /** @type {import('types').PageNode} */ ({ depth: 0, server });
	const manifest_data = /** @type {import('types').ManifestData} */ ({
		assets: [],
		hooks: { client: null, server: null, universal: null },
		nodes: [], // skip static analysis so that the missing file is first read by write_types
		params: null,
		routes: [
			{
				id: '/missing',
				parent: null,
				segment: 'missing',
				pattern: /^\/missing\/?$/,
				params: [],
				layout: null,
				error: null,
				leaf,
				page: { layouts: [], errors: [], leaf: 0 },
				endpoint: null
			}
		]
	});

	try {
		expect(update(config, manifest_data, path.join(root, server), root)).toBe(false);
		expect(fs.existsSync(path.join(outdir, '$types.d.ts'))).toBe(false);
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});
