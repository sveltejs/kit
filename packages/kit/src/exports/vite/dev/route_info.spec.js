import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import create_manifest_data from '../../../core/sync/create_manifest_data/index.js';
import { validate_config } from '../../../core/config/index.js';
import { get_route_info } from './route_info.js';

/** @type {string} */
let cwd;

beforeEach(() => {
	cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-route-info-'));
});

afterEach(() => {
	fs.rmSync(cwd, { recursive: true, force: true });
});

/** @param {Record<string, string>} files */
function write(files) {
	for (const [file, content] of Object.entries(files)) {
		const full = path.join(cwd, file);
		fs.mkdirSync(path.dirname(full), { recursive: true });
		fs.writeFileSync(full, content);
	}
}

function info() {
	const config = validate_config({});
	config.files.routes = path.join(cwd, 'src/routes');
	config.files.params = path.join(cwd, 'src/params');
	config.files.assets = path.join(cwd, 'static');

	return get_route_info(create_manifest_data(config, cwd, cwd), cwd);
}

test('lists the files, params and inherited page options of a route', () => {
	write({
		'layout.svelte': '',
		'error.svelte': '',
		'src/params.js': 'export const match = {};',
		'src/routes/+layout.svelte': '',
		'src/routes/+layout.server.js': 'export const ssr = false; export const prerender = true;',
		'src/routes/+layout.js': "export const prerender = 'auto';",
		'src/routes/blog/+error.svelte': '',
		'src/routes/blog/[slug=word]/+page.svelte': '',
		'src/routes/blog/[slug=word]/+page.js': 'export const csr = false;'
	});

	const { routes, matchers } = info();
	const route = routes.find((route) => route.id === '/blog/[slug=word]');

	expect(matchers).toBe('src/params.js');
	expect(route).toEqual({
		id: '/blog/[slug=word]',
		params: [{ name: 'slug', matcher: 'word', optional: false, rest: false }],
		page: {
			layouts: [
				{
					component: 'src/routes/+layout.svelte',
					universal: 'src/routes/+layout.js',
					server: 'src/routes/+layout.server.js'
				},
				null
			],
			errors: ['error.svelte', 'src/routes/blog/+error.svelte'],
			leaf: {
				component: 'src/routes/blog/[slug=word]/+page.svelte',
				universal: 'src/routes/blog/[slug=word]/+page.js',
				server: null
			},
			options: {
				ssr: { known: true, value: false, file: 'src/routes/+layout.server.js', inherited: true },
				csr: {
					known: true,
					value: false,
					file: 'src/routes/blog/[slug=word]/+page.js',
					inherited: false
				},
				prerender: { known: true, value: 'auto', file: 'src/routes/+layout.js', inherited: true },
				trailingSlash: { known: true, value: 'never', file: null, inherited: false }
			}
		},
		endpoint: null
	});
});

test('marks options as unknown only where analysis gave up', () => {
	write({
		'layout.svelte': '',
		'error.svelte': '',
		'src/routes/+layout.js': 'export const ssr = get_ssr();',
		'src/routes/+page.svelte': '',
		'src/routes/+page.js': 'export const csr = false;',
		'src/routes/api/+server.js': "export const trailingSlash = 'always'; export function GET() {}"
	});

	const { routes } = info();

	expect(routes.find((route) => route.id === '/')?.page?.options).toEqual({
		ssr: { known: false, file: 'src/routes/+layout.js', inherited: true },
		csr: { known: true, value: false, file: 'src/routes/+page.js', inherited: false },
		prerender: { known: false, file: 'src/routes/+layout.js', inherited: true },
		trailingSlash: { known: false, file: 'src/routes/+layout.js', inherited: true }
	});

	expect(routes.find((route) => route.id === '/api')?.endpoint).toEqual({
		file: 'src/routes/api/+server.js',
		options: {
			prerender: { known: true, value: false, file: null, inherited: false },
			trailingSlash: {
				known: true,
				value: 'always',
				file: 'src/routes/api/+server.js',
				inherited: false
			}
		}
	});
});
