import * as assert from 'uvu/assert';
import { runner } from '../../../runner'; // TODO make this a package?
import fetch from 'node-fetch';

runner((test, is_dev) => {
	test('serves /', async ({ visit, query_text }) => {
		await visit('/routing/');

		assert.equal(await query_text('h1'), 'Great success!');
	});

	test('serves /?', async ({ visit, query_text }) => {
		await visit('/routing/?');

		assert.equal(await query_text('h1'), 'Great success!');
	});

	test('serves static route', async ({ visit, query_text }) => {
		await visit('/routing/a');

		assert.equal(await query_text('h1'), 'a');
	});

	test('serves static route from dir/index.html file', async ({ visit, query_text }) => {
		await visit('/routing/b');

		assert.equal(await query_text('h1'), 'b');
	});

	test('serves static route under client directory', async ({ visit, query_text }) => {
		await visit('/routing/client/foo');
		assert.equal(await query_text('h1'), 'foo');

		await visit('/routing/client/bar');
		assert.equal(await query_text('h1'), 'bar');

		await visit('/routing/client/bar/b');
		assert.equal(await query_text('h1'), 'b');
	});

	test('serves dynamic route', async ({ visit, query_text }) => {
		await visit('/routing/test-slug');

		assert.equal(await query_text('h1'), 'test-slug');
	});

	test('navigates to a new page without reloading', async ({ 
			visit, query_text, prefetch_routes, capture_requests, click, wait_for_function 
		}) => {
		await visit('/routing/');

		await prefetch_routes().catch(e => {
			// from error handler tests; ignore
			if (!e.message.includes('Crashing now')) throw e;
		});

		const requests = await capture_requests(async () => {
			await click('a[href="a"]');

			await wait_for_function(() => document.location.pathname == '/routing/a');

			assert.equal(await query_text('h1'), 'a');
		});

		assert.equal(requests, []);
	});
	
	test('navigates programmatically', async ({ visit, query_text, goto }) => {
		await visit('/routing/a');

		await goto('/routing/b');

		assert.equal(await query_text('h1'), 'b');
	});

	test('prefetches programmatically', async ({ visit, baseUrl, capture_requests, prefetch }) => {
		await visit('/routing/a');

		const requests = await capture_requests( () => prefetch('b'));

		assert.equal(requests.length, 2);
		assert.equal(requests[1], `${baseUrl}/routing/b.json`);
	});

	test('sets Content-Type', async ({ baseUrl }) => {
		const { headers } = await fetch(`${baseUrl}/routing`);

		assert.equal(
			headers.get('content-type'),
			'text/html'
		);
	});

	test('calls a delete handler', async ({ visit, wait_for_function, click, evaluate }) => {
		await visit('/routing/delete-test');

		await click('.del');
		await wait_for_function(() => deleted);

		assert.equal(await evaluate(() => deleted.id), '42');
	});

	test('hydrates', async ({ visit, query_text, start }) => {
		await visit('/routing/hydrate-test');

		assert.equal(await query_text('h1'), 'Hi from server');

		await start();

		assert.equal(await query_text('h1'), 'Hi from browser');
	});

	/** @todo this fails and shows "custom layout" instead. It's probably a bug. */
	test.skip('does not attempt client-side navigation to server routes', async ({
		visit,
		query_text,
		prefetch_routes,
		click,
		wait_for_function
	}) => {
		await visit('/routing/');
		await prefetch_routes();

		await click('[href="ambiguous/ok.json"]');
		await wait_for_function(() => document.location.pathname == '/routing/ambiguous/ok.json');

		assert.equal(await query_text('body'), 'ok');
	});

	test('allows reserved words as route names', async ({ visit, query_text }) => {
		await visit('/routing/const');

		assert.equal(await query_text('h1'), 'reserved words are okay as routes');
	});

	test('accepts value-less query string parameter on server', async ({
		visit,
		query_text,
		wait_for_selector
	}) => {
		await visit('/routing/echo-query?message');

		await wait_for_selector('.echo-query');

		assert.equal(await query_text('h1'), '{"message":""}');
	});

	test('accepts value-less query string parameter on client', async ({
		visit,
		query_text,
		wait_for_selector,
		click
	}) => {
		await visit('/routing/');

		await click('a[href="echo-query?message"]');
		await wait_for_selector('.echo-query');

		assert.equal(await query_text('h1'), '{"message":""}');
	});

	test('accepts duplicated query string parameter on server', async ({ visit, query_text }) => {
		await visit('/routing/echo-query?p=one&p=two');

		assert.equal(await query_text('h1'), '{"p":["one","two"]}');
	});

	test('accepts duplicated query string parameter on client', async ({
		visit,
		click,
		wait_for_selector,
		query_text
	}) => {
		await visit('/routing/');

		await click('a[href="echo-query?p=one&p=two"]');
		await wait_for_selector('.echo-query');

		assert.equal(await query_text('h1'), '{"p":["one","two"]}');
	});

	/** @todo Host is not passed. this is a bug. */
	test.skip('can access host through page store', async ({ visit, query_text }) => {
		await visit('/routing/host');

		assert.equal(await query_text('h1'), 'localhost');

		// await r.sapper.start();
		// assert.equal(await query_text('h1'), 'localhost');
	});

	// skipped because Nightmare doesn't seem to focus the <a> correctly
	test('resets the active element after navigation', async ({ visit, click, wait_for_function }) => {
		await visit('/routing/');

		await click('[href="a"]');

		await wait_for_function(() => document.activeElement.nodeName == 'BODY');
	});

	/** @todo The body is "$& %svelte.body%"" which seems like a bug */
	test.skip('replaces %sapper.xxx% tags safely', async ({ visit, query_text }) => {
		await visit('/routing/unsafe-replacement');

		assert.match(await query_text('body'), '$& $&');
	});

	test('navigates between routes with empty parts', async ({
		visit,
		click,
		query_text,
		wait_for_selector
	}) => {
		await visit('/routing/dirs/foo');

		assert.equal(await query_text('h1'), 'foo');
		await click('[href="bar"]');
		await wait_for_selector('.bar');

		assert.equal(await query_text('h1'), 'bar');
	});

	test('navigates to ...rest', async ({ visit, click, query_text, wait_for_query_text_to_equal }) => {
		await visit('/routing/abc/xyz');

		assert.equal(await query_text('h1'), 'abc,xyz');
		await click('[href="/routing/xyz/abc/def/ghi"]');

		await wait_for_query_text_to_equal('h1', 'xyz,abc,def,ghi');
		assert.equal(await query_text('h2'), 'xyz,abc,def,ghi');

		await click('[href="/routing/xyz/abc/def"]');

		await wait_for_query_text_to_equal('h1', 'xyz,abc,def');
		assert.equal(await query_text('h2'), 'xyz,abc,def');

		await click('[href="/routing/xyz/abc/def"]');

		await wait_for_query_text_to_equal('h1', 'xyz,abc,def');
		assert.equal(await query_text('h2'), 'xyz,abc,def');

		await click('[href="/routing/xyz/abc"]');

		await wait_for_query_text_to_equal('h1', 'xyz,abc');
		assert.equal(await query_text('h2'), 'xyz,abc');

		await click('[href="/routing/xyz/abc/deep"]');

		await wait_for_query_text_to_equal('h1', 'xyz,abc');
		assert.equal(await query_text('h2'), 'xyz,abc');

		await click('[href="/routing/xyz/abc/qwe/deep.json"]');

		/** @todo Bug: req.params.rest is not an array */
		// await wait_for_query_text_to_equal('body', 'xyz,abc,qwe');
	});

	test('navigates between dynamic routes with same segments', async ({
		visit,
		click,
		wait_for_query_text_to_equal,
		query_text
	}) => {
		await visit('/routing/dirs/bar/xyz');

		assert.equal(await query_text('h1'), 'A page');

		await click('[href="/routing/dirs/foo/xyz"]');

		await wait_for_query_text_to_equal('h1', 'B page');
	});

	test('find regexp routes', async ({ visit, click, wait_for_query_text_to_equal, query_text }) => {
		await visit('/routing/qwe');

		assert.equal(await query_text('h1'), 'qwe');

		await click('[href="234"]');

		await wait_for_query_text_to_equal('h1', 'Regexp page 234');

		await click('[href="regexp/234"]');

		await wait_for_query_text_to_equal('h1', 'Nested regexp page 234');
	});

	/** @todo Kit is not exposing the headers. Should probably be added to req */
	test.skip('runs server route handlers before page handlers, if they match', async ({ baseUrl }) => {
		const res = await fetch(`${baseUrl}/routing/middleware`, {
			headers: {
				Accept: 'application/json'
			}
		});

		assert.equal(await res.json(), { json: true });

		const html = await fetch(`${baseUrl}/middleware`);

		assert.ok((await html.text()).indexOf('<h1>HTML</h1>') !== -1);
	});

	test('invalidates page when a segment is skipped', async ({ visit, click, wait_for_query_text_to_equal }) => {
		await visit('/routing/skipped/x/1');

		await click('a[href="/routing/skipped/y/1"]');
		
		await wait_for_query_text_to_equal('h1', 'y:1');
	});

	test('page store functions as expected', async ({ visit, click, query_text, wait_for_query_text_to_equal }) => {
		await visit('/routing/store');

		assert.equal(await query_text('h1'), 'Test');
		assert.equal(await query_text('h2'), 'Called 1 time');

		await click('a[href="store/result"]');

		await wait_for_query_text_to_equal('h1', 'Result');
		await wait_for_query_text_to_equal('h2', 'Called 1 time');
	});
});
