import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('$env', () => {
	test('$env/dynamic/private is not statically importable from the client', async ({ request }) => {
		const resp = await request.get('/env/dynamic-private');
		expect(await resp.text()).toMatch(
			/.*Error: Cannot import \$env\/dynamic\/private into client-side code:.*/gs
		);
	});

	test('$env/dynamic/private is not dynamically importable from the client', async ({
		request
	}) => {
		const resp = await request.get('/env/dynamic-private-dynamic-import');
		expect(await resp.text()).toMatch(
			/.*Error: Cannot import \$env\/dynamic\/private into client-side code:.*/gs
		);
	});

	test('$env/static/private is not statically importable from the client', async ({ request }) => {
		const resp = await request.get('/env/static-private');
		expect(await resp.text()).toMatch(
			/.*Error: Cannot import \$env\/static\/private into client-side code:.*/gs
		);
	});

	test('$env/static/private is not dynamically importable from the client', async ({ request }) => {
		const resp = await request.get('/env/static-private-dynamic-import');
		expect(await resp.text()).toMatch(
			/.*Error: Cannot import \$env\/static\/private into client-side code:.*/gs
		);
	});
});
