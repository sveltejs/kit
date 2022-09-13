import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('$env', () => {
	test('$env/dynamic/private is not statically importable from the client', async ({ request }) => {
		const resp = await request.get('/env/dynamic-private');
		expect(await resp.text()).toMatch(
			/.*Cannot import \$env\/dynamic\/private into public-facing code:.*/gs
		);
	});

	test('$env/dynamic/private is not dynamically importable from the client', async ({
		request
	}) => {
		const resp = await request.get('/env/dynamic-private-dynamic-import');
		expect(await resp.text()).toMatch(
			/.*Cannot import \$env\/dynamic\/private into public-facing code:.*/gs
		);
	});

	test('$env/static/private is not statically importable from the client', async ({ request }) => {
		const resp = await request.get('/env/static-private');
		expect(await resp.text()).toMatch(
			/.*Cannot import \$env\/static\/private into public-facing code:.*/gs
		);
	});

	test('$env/static/private is not dynamically importable from the client', async ({ request }) => {
		const resp = await request.get('/env/static-private-dynamic-import');
		expect(await resp.text()).toMatch(
			/.*Cannot import \$env\/static\/private into public-facing code:.*/gs
		);
	});
});

test.describe('server-only modules', () => {
	test('server-only module is not statically importable from the client', async ({ request }) => {
		const resp = await request.get('/server-only-modules/static-import');
		expect(await resp.text()).toMatch(
			/.*Cannot import \$lib\/test.server.js into public-facing code:.*/gs
		);
	});
	test('server-only module is not dynamically importable from the client', async ({ request }) => {
		const resp = await request.get('/server-only-modules/dynamic-import');
		expect(await resp.text()).toMatch(
			/.*Cannot import \$lib\/test.server.js into public-facing code:.*/gs
		);
	});
});

test.describe('server-only folder', () => {
	test('server-only folder is not statically importable from the client', async ({ request }) => {
		const resp = await request.get('/server-only-folder/static-import');
		expect(await resp.text()).toMatch(
			/.*Cannot import \$lib\/server\/blah\/test.js into public-facing code:.*/gs
		);
	});
	test('server-only folder is not dynamically importable from the client', async ({ request }) => {
		const resp = await request.get('/server-only-folder/dynamic-import');
		expect(await resp.text()).toMatch(
			/.*Cannot import \$lib\/server\/blah\/test.js into public-facing code:.*/gs
		);
	});
});
