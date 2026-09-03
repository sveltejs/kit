import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { process_config, validate_config } from '../config/index.js';
import { load_explicit_env } from '../env.js';
import { relative_path } from '../../utils/filesystem.js';
import { posixify } from '../../utils/os.js';
import { create, update } from './sync.js';
import create_manifest_data from './create_manifest_data/index.js';

test('generates client manifest imports relative to the project root', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svelte-kit-sync-'));
	const component = path.join(root, 'src/routes/+page.svelte');

	fs.mkdirSync(path.dirname(component), { recursive: true });
	fs.writeFileSync(component, '');
	fs.writeFileSync(
		path.join(root, 'src/app.html'),
		'<!doctype html><html><head>%sveltekit.head%</head><body>%sveltekit.body%</body></html>'
	);

	try {
		const config = process_config(validate_config({}), root);
		const manifest_data = create_manifest_data(config, root);
		create(config, root, manifest_data, true);
		const index = manifest_data.nodes.findIndex(
			(node) => node.component === 'src/routes/+page.svelte'
		);
		const output = path.join(config.outDir, 'generated/build/client');
		const generated = fs.readFileSync(path.join(output, `nodes/${index}.js`), 'utf8');

		expect(generated).toBe(
			`export { default as component } from ${JSON.stringify(relative_path(`${output}/nodes`, component))};`
		);
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});

test('explains circular imports through $app/env/private', async () => {
	const root = path.resolve(import.meta.dirname, '../../../test/apps/basics');
	const dir = fs.mkdtempSync(path.join(root, 'node_modules/.svelte-kit-env-'));
	const entry = path.join(dir, 'env.ts');

	fs.writeFileSync(
		entry,
		`import { defineEnvVars } from '@sveltejs/kit/env';
import './helper.js';
export const variables = defineEnvVars({ FOO: {} });
`
	);
	const helper = path.join(dir, 'helper.ts');
	fs.writeFileSync(helper, `import '$app/env/private';\n`);

	try {
		const config = process_config(validate_config({}), root);

		await expect(load_explicit_env(config, entry, root, 'development')).rejects.toThrow(
			`Module \`${posixify(path.relative(root, helper))}\` imports \`$app/env/private\`, which creates a circular dependency with \`src/env\``
		);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

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
