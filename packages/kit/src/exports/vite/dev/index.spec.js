import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import { expect, test } from 'vitest';
import { sveltekit } from '../index.js';

test('generates route types when the dev server starts', async () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sveltekit-dev-'));
	const src = path.join(root, 'src');
	const routes = path.join(src, 'routes');
	const outDir = path.join(root, '.svelte-kit');

	fs.mkdirSync(routes, { recursive: true });
	fs.writeFileSync(
		path.join(src, 'app.html'),
		'<!doctype html><html><head>%sveltekit.head%</head><body>%sveltekit.body%</body></html>'
	);
	fs.writeFileSync(path.join(routes, '+page.svelte'), '<h1>Hello</h1>');

	const server = await createServer({
		configFile: false,
		logLevel: 'silent',
		root,
		server: { port: 0 },
		plugins: await sveltekit({
			outDir,
			files: {
				assets: path.join(root, 'static'),
				appTemplate: path.join(src, 'app.html'),
				errorTemplate: path.join(src, 'error.html'),
				hooks: {
					client: path.join(src, 'hooks.client'),
					server: path.join(src, 'hooks.server'),
					universal: path.join(src, 'hooks')
				},
				params: path.join(src, 'params'),
				routes,
				serviceWorker: path.join(src, 'service-worker')
			}
		})
	});

	try {
		await server.listen();
		expect(fs.existsSync(path.join(outDir, 'types', 'src', 'routes', '$types.d.ts'))).toBe(true);
	} finally {
		await server.close();
		fs.rmSync(root, { recursive: true, force: true });
	}
});
