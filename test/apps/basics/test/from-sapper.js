import * as assert from 'uvu/assert';
import { runner } from '../../../runner'; // TODO make this a package?
import fetch from 'node-fetch';

runner((test, is_dev) => {
	test('serves /', async ({ visit, queryText }) => {
		await visit('/routing/');

		assert.equal(await queryText('h1'), 'Great success!');
	});

	test('serves /?', async ({ visit, queryText }) => {
		await visit('/routing/?');

		assert.equal(await queryText('h1'), 'Great success!');
	});

	test('serves static route', async ({ visit, queryText }) => {
		await visit('/routing/a');

		assert.equal(await queryText('h1'), 'a');
	});

	test('serves static route from dir/index.html file', async ({ visit, queryText }) => {
		await visit('/routing/b');

		assert.equal(await queryText('h1'), 'b');
	});

	test('serves static route under client directory', async ({ visit, queryText }) => {
		await visit('/routing/client/foo');
		assert.equal(await queryText('h1'), 'foo');

		await visit('/routing/client/bar');
		assert.equal(await queryText('h1'), 'bar');

		await visit('/routing/client/bar/b');
		assert.equal(await queryText('h1'), 'b');
	});

	test('serves dynamic route', async ({ visit, queryText }) => {
		await visit('/routing/test-slug');

		assert.equal(await queryText('h1'), 'test-slug');
	});

	test('navigates to a new page without reloading', async ({ 
			visit, queryText, prefetchRoutes, capture_requests, click, waitForFunction 
		}) => {
		await visit('/routing/');

		await prefetchRoutes().catch(e => {
			// from error handler tests; ignore
			if (!e.message.includes('Crashing now')) throw e;
		});

		const requests = await capture_requests(async () => {
			await click('a[href="a"]');

			await waitForFunction(() => document.location.pathname == '/routing/a');

			assert.equal(await queryText('h1'), 'a');
		});

		assert.equal(requests, []);
	});
	
	test('navigates programmatically', async ({ visit, queryText, goto }) => {
		await visit('/routing/a');

		await goto('/routing/b');

		assert.equal(await queryText('h1'), 'b');
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

	test('calls a delete handler', async ({ visit, waitForFunction, click, evaluate }) => {
		await visit('/routing/delete-test');

		await click('.del');
		await waitForFunction(() => deleted);

		assert.equal(await evaluate(() => deleted.id), '42');
	});

	test('hydrates', async ({ visit, queryText, start }) => {
		await visit('/routing/hydrate-test');

		assert.equal(await queryText('h1'), 'Hi from server');

		await start();

		assert.equal(await queryText('h1'), 'Hi from browser');
	});

	/** @todo this fails and shows "custom layout" instead. It's probably a bug. */
	test.skip('does not attempt client-side navigation to server routes', async ({
		visit,
		queryText,
		prefetchRoutes,
		click,
		waitForFunction
	}) => {
		await visit('/routing/');
		await prefetchRoutes();

		await click('[href="ambiguous/ok.json"]');
		await waitForFunction(() => document.location.pathname == '/routing/ambiguous/ok.json');

		assert.equal(await queryText('body'), 'ok');
	});

	test('allows reserved words as route names', async ({ visit, queryText }) => {
		await visit('/routing/const');

		assert.equal(await queryText('h1'), 'reserved words are okay as routes');
	});

	test('accepts value-less query string parameter on server', async ({
		visit,
		queryText,
		waitForSelector
	}) => {
		await visit('/routing/echo-query?message');

		await waitForSelector('.echo-query');

		assert.equal(await queryText('h1'), '{"message":""}');
	});

	test('accepts value-less query string parameter on client', async ({
		visit,
		queryText,
		waitForSelector,
		click
	}) => {
		await visit('/routing/');

		await click('a[href="echo-query?message"]');
		await waitForSelector('.echo-query');

		assert.equal(await queryText('h1'), '{"message":""}');
	});

	test('accepts duplicated query string parameter on server', async ({ visit, queryText }) => {
		await visit('/routing/echo-query?p=one&p=two');

		assert.equal(await queryText('h1'), '{"p":["one","two"]}');
	});

	test('accepts duplicated query string parameter on client', async ({
		visit,
		click,
		waitForSelector,
		queryText
	}) => {
		await visit('/routing/');

		await click('a[href="echo-query?p=one&p=two"]');
		await waitForSelector('.echo-query');

		assert.equal(await queryText('h1'), '{"p":["one","two"]}');
	});

	/** @todo Host is not passed. this is a bug. */
	test.skip('can access host through page store', async ({ visit, queryText }) => {
		await visit('/routing/host');

		assert.equal(await queryText('h1'), 'localhost');

		// await r.sapper.start();
		// assert.equal(await queryText('h1'), 'localhost');
	});

	// skipped because Nightmare doesn't seem to focus the <a> correctly
	test('resets the active element after navigation', async ({ visit, click, waitForFunction }) => {
		await visit('/routing/');

		await click('[href="a"]');

		await waitForFunction(() => document.activeElement.nodeName == 'BODY');
	});

	/** @todo The body is "$& %svelte.body%"" which seems like a bug */
	test.skip('replaces %sapper.xxx% tags safely', async ({ visit, queryText }) => {
		await visit('/routing/unsafe-replacement');

		assert.match(await queryText('body'), '$& $&');
	});

	test('navigates between routes with empty parts', async ({
		visit,
		click,
		queryText,
		waitForSelector
	}) => {
		await visit('/routing/dirs/foo');

		assert.equal(await queryText('h1'), 'foo');
		await click('[href="bar"]');
		await waitForSelector('.bar');

		assert.equal(await queryText('h1'), 'bar');
	});

	test('navigates to ...rest', async ({ visit, click, queryText, waitForQueryTextToEqual }) => {
		await visit('/routing/abc/xyz');

		assert.equal(await queryText('h1'), 'abc,xyz');
		await click('[href="/routing/xyz/abc/def/ghi"]');

		await waitForQueryTextToEqual('h1', 'xyz,abc,def,ghi');
		assert.equal(await queryText('h2'), 'xyz,abc,def,ghi');

		await click('[href="/routing/xyz/abc/def"]');

		await waitForQueryTextToEqual('h1', 'xyz,abc,def');
		assert.equal(await queryText('h2'), 'xyz,abc,def');

		await click('[href="/routing/xyz/abc/def"]');

		await waitForQueryTextToEqual('h1', 'xyz,abc,def');
		assert.equal(await queryText('h2'), 'xyz,abc,def');

		await click('[href="/routing/xyz/abc"]');

		await waitForQueryTextToEqual('h1', 'xyz,abc');
		assert.equal(await queryText('h2'), 'xyz,abc');

		await click('[href="/routing/xyz/abc/deep"]');

		await waitForQueryTextToEqual('h1', 'xyz,abc');
		assert.equal(await queryText('h2'), 'xyz,abc');

		await click('[href="/routing/xyz/abc/qwe/deep.json"]');

		/** @todo Bug: req.params.rest is not an array */
		// await waitForQueryTextToEqual('body', 'xyz,abc,qwe');
	});

	test('navigates between dynamic routes with same segments', async ({
		visit,
		click,
		waitForQueryTextToEqual,
		queryText
	}) => {
		await visit('/routing/dirs/bar/xyz');

		assert.equal(await queryText('h1'), 'A page');

		await click('[href="/routing/dirs/foo/xyz"]');

		await waitForQueryTextToEqual('h1', 'B page');
	});

	test('find regexp routes', async ({ visit, click, waitForQueryTextToEqual, queryText }) => {
		await visit('/routing/qwe');

		assert.equal(await queryText('h1'), 'qwe');

		await click('[href="234"]');

		await waitForQueryTextToEqual('h1', 'Regexp page 234');

		await click('[href="regexp/234"]');

		await waitForQueryTextToEqual('h1', 'Nested regexp page 234');
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

	test('invalidates page when a segment is skipped', async ({ visit, click, waitForQueryTextToEqual }) => {
		await visit('/routing/skipped/x/1');

		await click('a[href="/routing/skipped/y/1"]');
		
		await waitForQueryTextToEqual('h1', 'y:1');
	});

	test('page store functions as expected', async ({ visit, click, queryText, waitForQueryTextToEqual }) => {
		await visit('/routing/store');

		assert.equal(await queryText('h1'), 'Test');
		assert.equal(await queryText('h2'), 'Called 1 time');

		await click('a[href="store/result"]');

		await waitForQueryTextToEqual('h1', 'Result');
		await waitForQueryTextToEqual('h2', 'Called 1 time');
	});
});
