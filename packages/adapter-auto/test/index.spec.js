import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterAll, beforeAll, expect, test } from 'vitest';

const entry = new URL('../index.js', import.meta.url).href;
const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-auto test-'));

beforeAll(() => {
	const dir = path.join(cwd, 'node_modules/@sveltejs/adapter-node');
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(
		path.join(dir, 'package.json'),
		JSON.stringify({ type: 'module', exports: { '.': './index.js' } })
	);
	fs.writeFileSync(
		path.join(dir, 'index.js'),
		`export default () => ({
			name: '@sveltejs/adapter-node',
			adapt: (builder) => builder.result,
			emulate: () => ({ platform: () => ({ detected: true }) }),
			supports: { read: () => true, instrumentation: () => true },
			vite: process.env.FUNCTION_VITE
				? ({ config }) => ({ plugins: [{ name: config.appDir }] })
				: { plugins: { post: [{ name: 'detected-adapter-plugin' }] } }
		});`
	);
});

afterAll(() => fs.rmSync(cwd, { recursive: true, force: true }));

/**
 * Use a fresh process to exercise native ESM loading and project-relative adapter resolution.
 * @param {string} code
 * @param {Record<string, string>} [env]
 */
function run(code, env = {}) {
	return JSON.parse(
		execFileSync(
			process.execPath,
			[
				'--input-type=module',
				'-e',
				`
			import auto from ${JSON.stringify(entry)};
			const adapter = auto();
			${code}
		`
			],
			{
				cwd,
				env: {
					...process.env,
					VERCEL: '',
					CF_PAGES: '',
					NETLIFY: '',
					GITHUB_ACTION_REPOSITORY: '',
					SST: '',
					GCP_BUILDPACKS: '',
					RENDER: '',
					FUNCTION_VITE: '',
					...env
				},
				encoding: 'utf8'
			}
		)
	);
}

test.each(['RENDER', 'GCP_BUILDPACKS'])('exposes the detected adapter before adapt (%s)', (env) => {
	expect(
		run(
			`console.log(JSON.stringify({
			name: adapter.name,
			vite: adapter.vite,
			emulated: await adapter.emulate?.().platform(),
			read: adapter.supports?.read(),
			instrumentation: adapter.supports?.instrumentation()
		}));`,
			{ [env]: '1' }
		)
	).toEqual({
		name: '@sveltejs/adapter-node',
		vite: { plugins: { post: [{ name: 'detected-adapter-plugin' }] } },
		emulated: { detected: true },
		read: true,
		instrumentation: true
	});
});

test('preserves function-valued Vite configuration and creates fresh adapter instances', () => {
	expect(
		run(
			`
			const vite = adapter.vite({ config: { appDir: 'custom' } });
			adapter.vite = vite;
			console.log(JSON.stringify({ vite, next: typeof auto().vite }));
		`,
			{ RENDER: '1', FUNCTION_VITE: '1' }
		)
	).toEqual({ vite: { plugins: [{ name: 'custom' }] }, next: 'function' });
});

test('delegates adaptation and logs the detected environment', () => {
	expect(
		run(
			`
			const messages = [];
			const result = await adapter.adapt({
				result: 'adapted',
				log: { info: (message) => messages.push(message) }
			});
			console.log(JSON.stringify({ result, messages }));
		`,
			{ RENDER: '1' }
		)
	).toEqual({
		result: 'adapted',
		messages: ['Detected environment: Render. Using @sveltejs/adapter-node']
	});
});

test('retains the fallback when no supported environment is detected', () => {
	const result = run(`
		const messages = [];
		await adapter.adapt({ log: { warn: (message) => messages.push(message) } });
		const errors = ['read', 'instrumentation'].map((feature) => {
			try { adapter.supports[feature](); } catch (error) { return error.message; }
		});
		console.log(JSON.stringify({ name: adapter.name, vite: adapter.vite, messages, errors }));
	`);
	expect(result.name).toBe('@sveltejs/adapter-auto');
	expect(result.vite).toBeUndefined();
	expect(result.messages).toEqual([
		'Could not detect a supported production environment. See https://svelte.dev/docs/kit/adapters to learn how to configure your app to run on the platform of your choosing'
	]);
	for (const error of result.errors) {
		expect(error).toContain(
			'SvelteKit cannot determine whether it will work when your app is deployed'
		);
	}
});
