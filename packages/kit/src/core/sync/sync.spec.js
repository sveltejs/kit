import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { expect, test } from 'vitest';
import { process_config, validate_config } from '../config/index.js';
import { relative_path } from '../../utils/filesystem.js';
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

test('externalizes linked dependencies when loading explicit environment variables', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svelte-kit-env-'));
	const dependency = path.join(root, 'packages/linked-env-dependency');
	const loader = path.join(root, 'loader');
	const node_modules = path.join(root, 'node_modules');

	fs.mkdirSync(path.join(root, 'src'), { recursive: true });
	fs.mkdirSync(dependency, { recursive: true });
	fs.mkdirSync(loader, { recursive: true });
	fs.mkdirSync(node_modules, { recursive: true });

	fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
	fs.writeFileSync(
		path.join(root, 'src/env.js'),
		`import { marker } from 'linked-env-dependency';

export const variables = {
	TEST: { description: marker }
};
`
	);
	fs.writeFileSync(
		path.join(dependency, 'package.json'),
		'{"name":"linked-env-dependency","type":"module","exports":"./index.js"}'
	);
	fs.writeFileSync(
		path.join(dependency, 'index.js'),
		`import { marker } from 'loader-target';

export { marker };
`
	);
	fs.writeFileSync(path.join(loader, 'target.js'), `export const marker = 'resolved by loader';\n`);
	fs.writeFileSync(
		path.join(loader, 'hooks.js'),
		`export async function resolve(specifier, context, nextResolve) {
	if (specifier === 'loader-target') {
		return {
			url: new URL('./target.js', import.meta.url).href,
			shortCircuit: true
		};
	}

	return nextResolve(specifier, context);
}
`
	);
	fs.writeFileSync(
		path.join(loader, 'register.js'),
		`import { register } from 'node:module';

register('./hooks.js', import.meta.url);
`
	);

	const config_url = pathToFileURL(path.resolve(import.meta.dirname, '../config/index.js')).href;
	const env_url = pathToFileURL(path.resolve(import.meta.dirname, '../env.js')).href;
	fs.writeFileSync(
		path.join(root, 'run.js'),
		`import { fileURLToPath } from 'node:url';
import { process_config, validate_config } from ${JSON.stringify(config_url)};
import { load_explicit_env } from ${JSON.stringify(env_url)};

const config = process_config(validate_config({}), import.meta.dirname);
const file = fileURLToPath(new URL('./src/env.js', import.meta.url));
const { variables } = await load_explicit_env(config, file, import.meta.dirname, 'development');

if (variables.TEST.description !== 'resolved by loader') {
	throw new Error('Node loader was not used');
}
`
	);

	const link_type = process.platform === 'win32' ? 'junction' : 'dir';
	fs.symlinkSync(dependency, path.join(node_modules, 'linked-env-dependency'), link_type);
	fs.symlinkSync(
		path.resolve(import.meta.dirname, '../../../node_modules/vite'),
		path.join(node_modules, 'vite'),
		link_type
	);

	try {
		execFileSync(process.execPath, [path.join(root, 'run.js')], {
			cwd: root,
			env: {
				...process.env,
				NODE_OPTIONS: [
					process.env.NODE_OPTIONS,
					`--import=${pathToFileURL(path.join(loader, 'register.js')).href}`
				]
					.filter(Boolean)
					.join(' ')
			}
		});
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});
