import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { assert, test } from 'vitest';

const timeout = 60_000;

test('CSRF protection is enabled in non-production builds', { timeout }, async () => {
	const cwd = path.join(process.cwd(), 'apps/csrf-non-production-node-env');

	execSync('pnpm build', {
		cwd,
		stdio: 'pipe',
		timeout,
		env: { ...process.env, NODE_ENV: 'staging' }
	});

	const server_root = path.join(cwd, '.svelte-kit/output/server');
	const [{ Server }, { manifest }] = await Promise.all([
		import(pathToFileURL(path.join(server_root, 'index.js')).href),
		import(pathToFileURL(path.join(server_root, 'manifest.js')).href)
	]);

	const server = new Server(manifest);
	await server.init({ env: {} });

	const options = { getClientAddress: () => '127.0.0.1' };
	const response = await server.respond(new Request('http://localhost/'), options);
	assert.equal(response.status, 200);

	const csrf_response = await server.respond(
		new Request('http://localhost/', {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'https://evil.example'
			},
			body: 'foo=bar'
		}),
		options
	);

	assert.equal(csrf_response.status, 403);
	assert.equal(await csrf_response.text(), 'Cross-site POST form submissions are forbidden');
});
