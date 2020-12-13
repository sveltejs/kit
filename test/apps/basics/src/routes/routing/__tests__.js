import * as assert from 'uvu/assert';

export default function (test) {
	test('redirects from /routing/ to /routing', async ({ visit, text, pathname }) => {
		await visit('/routing/');
		assert.equal(await pathname(), '/routing');
		assert.equal(await text('h1'), 'Great success!');
	});

	test('redirects from /routing/? to /routing', async ({ visit, text, pathname }) => {
		await visit('/routing/?');
		assert.equal(await pathname(), '/routing');
		assert.equal(await text('h1'), 'Great success!');
	});

	test('redirects from /routing/?foo=bar to /routing?foo=bar', async ({ visit, text, pathname }) => {
		await visit('/routing/?foo=bar');
		assert.equal(await pathname(), '/routing?foo=bar');
		assert.equal(await text('h1'), 'Great success!');
	});

	test('serves static route', async ({ visit, text }) => {
		await visit('/routing/a');

		assert.equal(await text('h1'), 'a');
	});

	test('serves static route from dir/index.html file', async ({ visit, text }) => {
		await visit('/routing/b');

		assert.equal(await text('h1'), 'b');
	});

	test('serves static route under client directory', async ({ visit, text }) => {
		await visit('/routing/client/foo');
		assert.equal(await text('h1'), 'foo');

		await visit('/routing/client/bar');
		assert.equal(await text('h1'), 'bar');

		await visit('/routing/client/bar/b');
		assert.equal(await text('h1'), 'b');
	});

	test('serves dynamic route', async ({ visit, text }) => {
		await visit('/routing/test-slug');

		assert.equal(await text('h1'), 'test-slug');
	});

	test('navigates to a new page without reloading', async ({
		visit,
		text,
		prefetch_routes,
		capture_requests,
		click,
		wait_for_function,
		js
	}) => {
		if (js) {
			await visit('/routing');

			await prefetch_routes().catch(e => {
				// from error handler tests; ignore
				if (!e.message.includes('Crashing now')) throw e;
			});

			// weird flakiness — without this, some requests are
			// reported after prefetch_routes has finished
			await new Promise(f => setTimeout(f, 100));

			const requests = await capture_requests(async () => {
				await click('a[href="/routing/a"]');

				await wait_for_function(() => document.location.pathname == '/routing/a');

				assert.equal(await text('h1'), 'a');
			});

			assert.equal(requests, []);
		}
	});

	test('navigates programmatically', async ({ visit, text, goto, js }) => {
		if (js) {
			await visit('/routing/a');

			await goto('/routing/b');

			assert.equal(await text('h1'), 'b');
		}
	});

	test('prefetches programmatically', async ({ visit, base, capture_requests, prefetch, js }) => {
		if (js) {
			await visit('/routing/a');

			const requests = await capture_requests(() => prefetch('b'));

			assert.equal(requests.length, 2);
			assert.equal(requests[1], `${base}/routing/b.json`);
		}
	});

	test('does not attempt client-side navigation to server routes', async ({
		visit,
		text,
		click,
		wait_for_function
	}) => {
		await visit('/routing');

		await click('[href="/routing/ambiguous/ok.json"]');
		await wait_for_function(() => document.location.pathname == '/routing/ambiguous/ok.json');

		assert.equal(await text('body'), 'ok');
	});

	test('allows reserved words as route names', async ({ visit, text }) => {
		await visit('/routing/const');

		assert.equal(await text('h1'), 'reserved words are okay as routes');
	});

	test('resets the active element after navigation', async ({ visit, click, wait_for_function }) => {
		await visit('/routing');

		await click('[href="/routing/a"]');

		await wait_for_function(() => document.activeElement.nodeName == 'BODY');
	});

	test('navigates between routes with empty parts', async ({
		visit,
		click,
		text,
		wait_for_selector
	}) => {
		await visit('/routing/dirs/foo');

		assert.equal(await text('h1'), 'foo');
		await click('[href="bar"]');
		await wait_for_selector('.bar');

		assert.equal(await text('h1'), 'bar');
	});

	test('navigates to ...rest', async ({ visit, click, text, wait_for_text }) => {
		await visit('/routing/abc/xyz');

		assert.equal(await text('h1'), 'abc,xyz');
		await click('[href="/routing/xyz/abc/def/ghi"]');

		await wait_for_text('h1', 'xyz,abc,def,ghi');
		assert.equal(await text('h2'), 'xyz,abc,def,ghi');

		await click('[href="/routing/xyz/abc/def"]');

		await wait_for_text('h1', 'xyz,abc,def');
		assert.equal(await text('h2'), 'xyz,abc,def');

		await click('[href="/routing/xyz/abc/def"]');

		await wait_for_text('h1', 'xyz,abc,def');
		assert.equal(await text('h2'), 'xyz,abc,def');

		await click('[href="/routing/xyz/abc"]');

		await wait_for_text('h1', 'xyz,abc');
		assert.equal(await text('h2'), 'xyz,abc');

		await click('[href="/routing/xyz/abc/deep"]');

		await wait_for_text('h1', 'xyz,abc');
		assert.equal(await text('h2'), 'xyz,abc');

		await click('[href="/routing/xyz/abc/qwe/deep.json"]');

		await wait_for_text('body', 'xyz,abc,qwe');
	});

	test('navigates between dynamic routes with same segments', async ({
		visit,
		click,
		wait_for_text,
		text
	}) => {
		await visit('/routing/dirs/bar/xyz');

		assert.equal(await text('h1'), 'A page');

		await click('[href="/routing/dirs/foo/xyz"]');

		await wait_for_text('h1', 'B page');
	});

	test('find regexp routes', async ({ visit, click, wait_for_text, text }) => {
		await visit('/routing/qwe');

		assert.equal(await text('h1'), 'qwe');

		await click('[href="234"]');

		await wait_for_text('h1', 'Regexp page 234');

		await click('[href="regexp/234"]');

		await wait_for_text('h1', 'Nested regexp page 234');
	});

	test('invalidates page when a segment is skipped', async ({ visit, click, wait_for_text }) => {
		await visit('/routing/skipped/x/1');

		await wait_for_text('h1', 'x/1');

		await click('#goto-y1');

		await wait_for_text('h1', 'y/1');
	});
}
