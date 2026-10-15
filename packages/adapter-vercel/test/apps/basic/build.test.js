import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, assert, beforeAll, test } from 'vitest';
import { deploy, location } from '../../../../../test-utils/deploy.js';

const app = location(import.meta.dirname);
const output = path.join(app, '.vercel/output');
const functions = `${output}/functions/api/json`;

/** @type {{ routes: Array<{ src?: string, dest?: string, handle?: string }> }} */
let config;
/** @type {string} */
let build_log;
beforeAll(() => {
	deploy(import.meta.dirname);

	// Stand-ins for packages like resend: optional features import absent peers from
	// both entry points. Keep required failures alongside them to test the filtering.
	const fixture = `${app}/node_modules/optional-peer-fixture`;
	fs.mkdirSync(`${fixture}/dist`, { recursive: true });
	fs.writeFileSync(
		`${fixture}/package.json`,
		JSON.stringify({
			name: 'optional-peer-fixture',
			type: 'module',
			exports: { import: './dist/index.mjs', require: './dist/index.cjs' },
			peerDependencies: {
				'absent-optional-peer': '*',
				'@optional/peer': '*',
				'absent-required-peer': '*',
				'installed-optional-peer': '*'
			},
			peerDependenciesMeta: {
				'absent-optional-peer': { optional: true },
				'@optional/peer': { optional: true },
				'absent-required-peer': { optional: false },
				'installed-optional-peer': { optional: true }
			}
		})
	);
	const imports = `
		function unused() {
			return Promise.all([
				import('absent-optional-peer'),
				import('@optional/peer'),
				import('@optional/peer/subpath'),
				import('absent-required-peer'),
				import('installed-optional-peer'),
				import('installed-optional-peer/missing'),
				import('absent-undeclared-dependency'),
				import('./absent-relative.json')
			]);
		}
	`;
	fs.writeFileSync(
		`${fixture}/dist/index.mjs`,
		`${imports}
export const value = 'ok';`
	);
	fs.writeFileSync(
		`${fixture}/dist/index.cjs`,
		`${imports}
exports.value = 'ok';`
	);

	const installed = `${app}/node_modules/installed-optional-peer`;
	fs.mkdirSync(installed, { recursive: true });
	fs.writeFileSync(`${installed}/package.json`, JSON.stringify({ main: 'index.js' }));
	fs.writeFileSync(`${installed}/index.js`, "exports.value = 'installed';");

	fs.mkdirSync(`${app}/src/routes/optional-peer`, { recursive: true });
	fs.writeFileSync(
		`${app}/src/routes/optional-peer/+server.js`,
		`import { value } from 'optional-peer-fixture';
export function GET() { return new Response(value); }`
	);

	const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
		cwd: app,
		encoding: 'utf8'
	});
	build_log = result.stdout + result.stderr;
	assert.equal(result.status, 0, build_log);
	config = JSON.parse(fs.readFileSync(`${output}/config.json`, 'utf8'));
}, 60_000);

afterAll(() => fs.rmSync(app, { recursive: true, force: true }));

test('missing optional peers do not produce trace warnings', () => {
	assert.notInclude(build_log, 'absent-optional-peer');
	assert.notInclude(build_log, '@optional/peer');
});

test('missing required dependencies still produce trace warnings', () => {
	assert.include(build_log, 'absent-required-peer');
	assert.include(build_log, 'absent-undeclared-dependency');
	assert.include(build_log, 'absent-relative.json');
	assert.include(build_log, 'installed-optional-peer/missing');
});

/** @param {string} pathname */
const sources = (pathname) =>
	config.routes.flatMap((route) =>
		typeof route.src === 'string' && route.src.includes(pathname) ? [route.src] : []
	);

test('installed optional peers are still included in the function bundle', () => {
	const dir = fs.realpathSync(`${output}/functions/optional-peer.func`);
	const files = fs.readdirSync(dir, { recursive: true });
	assert.ok(
		files.some((file) =>
			file.endsWith(path.join('node_modules', 'installed-optional-peer', 'index.js'))
		)
	);
});

test('an unused optional peer does not prevent the bundled function from running', () => {
	const dir = fs.realpathSync(`${output}/functions/optional-peer.func`);
	const config = JSON.parse(fs.readFileSync(`${dir}/.vc-config.json`, 'utf8'));
	const result = spawnSync(
		process.execPath,
		[
			'--input-type=module',
			'-e',
			`const { default: handler } = await import('./' + ${JSON.stringify(config.handler)});
			const response = await handler.fetch(new Request('http://localhost/optional-peer'));
			console.log(response.status, await response.text());`
		],
		{ cwd: dir, encoding: 'utf8', env: { ...process.env, INSTRUMENTATION_ENV: '' } }
	);
	assert.equal(result.status, 0, result.stderr);
	assert.include(result.stdout, '200 ok');
});

test('API route function is generated', () => {
	assert.ok(fs.existsSync(`${functions}.func`));
});

test('API route ISR configuration is generated', () => {
	assert.ok(fs.existsSync(`${functions}.prerender-config.json`));
});

test('__data.json function is not generated for server-only route', () => {
	assert.ok(!fs.existsSync(`${functions}/__data.json.func`));
});

test('__data.json prerender config is not generated for server-only route', () => {
	assert.ok(!fs.existsSync(`${functions}/__data.json.prerender-config.json`));
});

test('root and index routes keep distinct functions', () => {
	const targets = ['/', '/index'].map((pathname) => {
		const route = config.routes.find(
			(route) => route.src && route.dest && new RegExp(route.src).test(pathname)
		);
		assert.ok(route?.dest && route.src);
		assert.ok(new RegExp(route.src).test(`${pathname.replace(/\/$/, '')}/__data.json`));
		const base = `${output}/functions${route.dest}`;
		const target = fs.realpathSync(`${base}.func`);
		if (pathname === '/') {
			assert.ok(
				config.routes.indexOf(route) < config.routes.findIndex((r) => r.handle === 'filesystem')
			);
		} else {
			assert.equal(fs.realpathSync(`${base}/__data.json.func`), target);
		}
		return target;
	});

	assert.notEqual(targets[0], targets[1]);
});

test('API route is present in Vercel routing configuration', () => {
	assert.ok(sources('/api/json').some((src) => !src.includes('__data.json')));
});

test('__data.json route is not present in Vercel routing configuration for server-only route', () => {
	assert.ok(!sources('/api/json').some((src) => src.includes('__data.json')));
});

test('__data.json function exists for ISR page route', () => {
	assert.ok(fs.existsSync(`${output}/functions/isr/__data.json.func`));
});

test('__data.json function exists in Vercel routing configuration', () => {
	assert.ok(sources('/isr').some((src) => src.includes('__data.json')));
});

test('ISR routes capture the requested pathname', () => {
	const route = config.routes.find((route) => route.src === '^(/isr-trailing-slash/?)$');
	assert.equal(route?.dest, '/isr-trailing-slash?__pathname=$1');
});

test('static ISR routes are matched before the filesystem', () => {
	const filesystem = config.routes.findIndex((route) => route.handle === 'filesystem');
	const index = config.routes.findIndex((route) => route.src === '^(/isr-trailing-slash/?)$');
	assert.ok(index < filesystem);
});

test('dynamic ISR routes are matched after the filesystem', () => {
	const filesystem = config.routes.findIndex((route) => route.handle === 'filesystem');
	const index = config.routes.findIndex((route) => route.src === '^(/isr/([^/]+?)/?)$');
	assert.ok(index > filesystem);
});

test('process.cwd() is traced from the project directory', () => {
	const function_dir = fs.realpathSync(`${output}/functions/process-cwd.func`);
	assert.ok(fs.existsSync(`${function_dir}/asset.txt`));
});
