import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { expect } from '@playwright/test';
import { test } from '../../../../utils.js';

// Each test builds an isolated app so it can change routes without affecting the
// app being used by the other tests (or sharing Vite's module cache).
test.describe('build --watch', () => {
	test.skip(({ javaScriptEnabled }) => !!process.env.DEV || !javaScriptEnabled);
	test.setTimeout(120_000);

	for (const [strategy, initially_present, resolution] of /** @type {const} */ ([
		['split', false, 'client'],
		['split', true, 'server'],
		['single', false, 'client'],
		['inline', false, 'client']
	])) {
		test(`updates route entries (${strategy}/${resolution}, ${initially_present ? 'remove' : 'add'} first)`, async ({
			browser
		}, test_info) => {
			const root = test_info.outputPath('app');
			/** @param {string} file @param {string} content */
			const write = (file, content) => {
				fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
				fs.writeFileSync(path.join(root, file), content);
			};
			write('package.json', '{"type":"module"}');
			write(
				'src/app.html',
				'<html><head>%sveltekit.head%</head><body><div>%sveltekit.body%</div></body></html>'
			);
			write('src/routes/+page.svelte', '<h1>home</h1><a href="/about">about</a>');
			write(
				'vite.config.js',
				`
				import fs from 'node:fs';
				import { sveltekit } from '@sveltejs/kit/vite';
				export default {
					plugins: [sveltekit({ output: { bundleStrategy: '${strategy}' }, router: { resolution: '${resolution}' }, adapter: {
						name: 'watch-test',
						adapt(builder) {
							if (fs.existsSync('fail-adapt')) throw new Error('watch adapter failed');
							console.log('WATCH_BUILD_COMPLETED:' + builder.routes.some((route) => route.id === '/about'));
						}
					} })]
				};
			`
			);
			const add = () => {
				write(
					'src/routes/about/+page.svelte',
					'<script>let { data } = $props(); let count = $state(0);</script><h1>about</h1><p>{data.server} {data.universal}</p><button onclick={() => count++}>{count}</button>'
				);
				write(
					'src/routes/about/+page.server.js',
					"export const load = () => ({ server: 'server' });"
				);
				write(
					'src/routes/about/+page.js',
					"export const load = ({ data }) => ({ ...data, universal: 'universal' });"
				);
				write(
					'src/routes/about/api/+server.js',
					"export const GET = () => new Response('endpoint');"
				);
				write(
					'src/routes/+layout.svelte',
					`<script>
						import { onMount } from 'svelte';
						let { children } = $props();
						onMount(() => document.body.classList.add('started'));
					</script><main>{@render children()}</main>`
				);
				write('src/routes/+error.svelte', '<h1>error</h1>');
				write(
					'src/params.js',
					`import { defineParams } from '@sveltejs/kit/params';
					export const params = defineParams({ word: (value) => value === 'matched' ? value : undefined });`
				);
				write('src/routes/about/[slug=word]/+page.svelte', '<h1>matched</h1>');
				write(
					'src/hooks.server.js',
					`export const handle = async ({ event, resolve }) => {
					const response = await resolve(event);
					response.headers.set('x-watch-hook', 'present');
					return response;
				};`
				);
			};
			const remove = () => {
				fs.rmSync(path.join(root, 'src/routes/about'), { recursive: true });
				fs.rmSync(path.join(root, 'src/routes/+layout.svelte'));
				fs.rmSync(path.join(root, 'src/routes/+error.svelte'));
				fs.rmSync(path.join(root, 'src/params.js'));
				fs.rmSync(path.join(root, 'src/hooks.server.js'));
			};
			if (initially_present) add();

			/** @param {string} name @param {string} script */
			const start = (name, script) => {
				write(name, script);
				const child = spawn(process.execPath, [name], {
					cwd: root,
					env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
					stdio: ['ignore', 'pipe', 'pipe']
				});
				let output = '';
				child.stdout.on('data', (data) => (output += data));
				child.stderr.on('data', (data) => (output += data));
				return {
					output: () => output,
					async close() {
						if (child.exitCode !== null || child.signalCode !== null) return;
						const closed = once(child, 'exit');
						child.kill();
						await closed;
					}
				};
			};

			const watcher = start(
				'watch.js',
				`
				import { createBuilder } from 'vite';
				const builder = await createBuilder({ build: { watch: { buildDelay: 100 } } });
				await builder.buildApp();
			`
			);
			let mark = 0;
			/** @param {boolean} present */
			const built = async (present) => {
				// A filesystem change can produce several events/builds. Wait for
				// a completed build with the requested route set, not a fixed count.
				await expect
					.poll(() => watcher.output().slice(mark), {
						timeout: 30_000,
						message: 'watch build should complete with the current routes'
					})
					.toContain(`WATCH_BUILD_COMPLETED:${present}`);
				mark = watcher.output().length;
			};

			/** @param {boolean} present */
			const check = async (present) => {
				// A new preview process avoids caching the previous build's server.
				const preview = start(
					'preview.js',
					`
					import { preview } from 'vite';
					const server = await preview({ preview: { port: 0 } });
					console.log('PREVIEW_URL=' + server.resolvedUrls.local[0]);
				`
				);
				const page = await browser.newPage();
				try {
					await expect.poll(() => preview.output(), { timeout: 15_000 }).toContain('PREVIEW_URL=');
					const url = /PREVIEW_URL=(\S+)/.exec(preview.output())?.[1];
					expect(url).toBeTruthy();
					const endpoint = await page.request.get(`${url}about/api`);
					expect(endpoint.status()).toBe(present ? 200 : 404);
					if (present) expect(await endpoint.text()).toBe('endpoint');
					const matched = await page.request.get(`${url}about/matched`);
					expect(matched.status()).toBe(present ? 200 : 404);
					if (present) expect(await matched.text()).toContain('<h1>matched</h1>');
					const response = await page.goto(`${url}about`);
					expect(response?.headers()['x-watch-hook']).toBe(present ? 'present' : undefined);
					expect(response?.status()).toBe(present ? 200 : 404);
					if (present) {
						await expect(page.locator('body')).toHaveClass('started');
						await expect(page.locator('h1')).toHaveText('about');
						await expect(page.locator('p')).toHaveText('server universal');
						await page.getByRole('button').click();
						await expect(page.getByRole('button')).toHaveText('1');
						await page.goto(/** @type {string} */ (url));
						await expect(page.locator('body')).toHaveClass('started');
						await page.evaluate(() => {
							document.body.dataset.navigation = 'client';
						});
						await page.getByRole('link', { name: 'about' }).click();
						await expect(page.locator('h1')).toHaveText('about');
						await expect(page.locator('p')).toHaveText('server universal');
						await expect(page.locator('body')).toHaveAttribute('data-navigation', 'client');
					}
				} finally {
					await page.close();
					await preview.close();
				}
			};

			try {
				await built(initially_present);
				await check(initially_present);
				for (const present of [!initially_present, initially_present, !initially_present]) {
					if (present) add();
					else remove();
					await built(present);
					await check(present);
				}
				// Fail after SSR/client building, when the initial build promise is
				// already settled, then ensure the watcher can recover.
				write('fail-adapt', '');
				write('src/routes/+page.svelte', '<h1>failing build</h1>');
				await expect
					.poll(() => watcher.output(), { timeout: 30_000 })
					.toContain('Error: watch adapter failed');
				mark = watcher.output().length;
				fs.unlinkSync(path.join(root, 'fail-adapt'));
				write('src/routes/+page.svelte', '<h1>recovered</h1><a href="/about">about</a>');
				await built(!initially_present);
				await check(!initially_present);
			} finally {
				await watcher.close();
				await test_info.attach('watch.log', { body: watcher.output(), contentType: 'text/plain' });
			}
		});
	}
});
