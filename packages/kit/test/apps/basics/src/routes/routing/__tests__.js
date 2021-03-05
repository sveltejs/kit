import * as assert from 'uvu/assert';

export default function (test) {
	test(
		'redirects from /routing/ to /routing',
		'/routing/slashes',
		async ({ visit, page, goto, text, pathname, js }) => {
			await page.click('a[href="/routing/"]');
			assert.equal(await pathname(), '/routing');
			assert.equal(await text('h1'), 'Great success!');

			if (js) {
				await visit('/routing/slashes');
				await goto('/routing/');
				assert.equal(await pathname(), '/routing');
				assert.equal(await text('h1'), 'Great success!');
			}
		}
	);

	test(
		'redirects from /routing/? to /routing',
		'/routing/slashes',
		async ({ visit, page, goto, text, pathname, js }) => {
			await page.click('a[href="/routing/?"]');
			assert.equal(await pathname(), '/routing');
			assert.equal(await text('h1'), 'Great success!');

			if (js) {
				await visit('/routing/slashes');
				await goto('/routing/?');
				assert.equal(await pathname(), '/routing');
				assert.equal(await text('h1'), 'Great success!');
			}
		}
	);

	test(
		'redirects from /routing/?foo=bar to /routing?foo=bar',
		'/routing/slashes',
		async ({ visit, page, goto, text, pathname, js }) => {
			await page.click('a[href="/routing/?foo=bar"]');
			assert.equal(await pathname(), '/routing?foo=bar');
			assert.equal(await text('h1'), 'Great success!');

			if (js) {
				await visit('/routing/slashes');
				await goto('/routing/?foo=bar');
				assert.equal(await pathname(), '/routing?foo=bar');
				assert.equal(await text('h1'), 'Great success!');
			}
		}
	);

	test('serves static route', '/routing/a', async ({ text }) => {
		assert.equal(await text('h1'), 'a');
	});

	test('serves static route from dir/index.html file', '/routing/b', async ({ text }) => {
		assert.equal(await text('h1'), 'b');
	});

	test(
		'serves static route under client directory',
		'/routing/client/foo',
		async ({ visit, text }) => {
			assert.equal(await text('h1'), 'foo');

			await visit('/routing/client/bar');
			assert.equal(await text('h1'), 'bar');

			await visit('/routing/client/bar/b');
			assert.equal(await text('h1'), 'b');
		}
	);

	test('serves dynamic route', '/routing/test-slug', async ({ text }) => {
		assert.equal(await text('h1'), 'test-slug');
	});

	test(
		'navigates to a new page without reloading',
		'/routing',
		async ({ text, prefetch_routes, capture_requests, page, js }) => {
			if (js) {
				await prefetch_routes().catch((e) => {
					// from error handler tests; ignore
					if (!e.message.includes('Crashing now')) throw e;
				});

				// weird flakiness — without this, some requests are
				// reported after prefetch_routes has finished
				await page.waitForTimeout(500);

				const requests = await capture_requests(async () => {
					await page.click('a[href="/routing/a"]');

					await page.waitForFunction(() => document.location.pathname == '/routing/a');

					assert.equal(await text('h1'), 'a');
				});

				assert.equal(requests, []);
			}
		}
	);

	test('navigates programmatically', '/routing/a', async ({ text, goto, js }) => {
		if (js) {
			await goto('/routing/b');
			assert.equal(await text('h1'), 'b');
		}
	});

	test(
		'prefetches programmatically',
		'/routing/a',
		async ({ base, capture_requests, prefetch, js }) => {
			if (js) {
				const requests = await capture_requests(() => prefetch('b'));

				assert.equal(requests.length, 2);
				assert.equal(requests[1], `${base}/routing/b.json`);
			}
		}
	);

	test(
		'does not attempt client-side navigation to server routes',
		'/routing',
		async ({ text, page }) => {
			await page.click('[href="/routing/ambiguous/ok.json"]');
			await page.waitForFunction(() => document.location.pathname == '/routing/ambiguous/ok.json');

			assert.equal(await text('body'), 'ok');
		}
	);

	test('allows reserved words as route names', '/routing/const', async ({ text }) => {
		assert.equal(await text('h1'), 'reserved words are okay as routes');
	});

	test('resets the active element after navigation', '/routing', async ({ page }) => {
		await page.click('[href="/routing/a"]');
		await page.waitForFunction(() => document.activeElement.nodeName == 'BODY');
	});

	test('navigates between routes with empty parts', '/routing/dirs/foo', async ({ page, text }) => {
		assert.equal(await text('h1'), 'foo');
		await page.click('[href="bar"]');
		await page.waitForSelector('.bar');

		assert.equal(await text('h1'), 'bar');
	});

	test('navigates to ...rest', '/routing/abc/xyz', async ({ page, text, wait_for_text }) => {
		assert.equal(await text('h1'), 'abc,xyz');
		await page.click('[href="/routing/xyz/abc/def/ghi"]');

		await wait_for_text('h1', 'xyz,abc,def,ghi');
		assert.equal(await text('h2'), 'xyz,abc,def,ghi');

		await page.click('[href="/routing/xyz/abc/def"]');

		await wait_for_text('h1', 'xyz,abc,def');
		assert.equal(await text('h2'), 'xyz,abc,def');

		await page.click('[href="/routing/xyz/abc/def"]');

		await wait_for_text('h1', 'xyz,abc,def');
		assert.equal(await text('h2'), 'xyz,abc,def');

		await page.click('[href="/routing/xyz/abc"]');

		await wait_for_text('h1', 'xyz,abc');
		assert.equal(await text('h2'), 'xyz,abc');

		await page.click('[href="/routing/xyz/abc/deep"]');

		await wait_for_text('h1', 'xyz,abc');
		assert.equal(await text('h2'), 'xyz,abc');

		await page.click('[href="/routing/xyz/abc/qwe/deep.json"]');

		await wait_for_text('body', 'xyz,abc,qwe');
	});

	test(
		'navigates between dynamic routes with same segments',
		'/routing/dirs/bar/xyz',
		async ({ page, wait_for_text, text }) => {
			assert.equal(await text('h1'), 'A page');

			await page.click('[href="/routing/dirs/foo/xyz"]');

			await wait_for_text('h1', 'B page');
		}
	);

	test('find regexp routes', '/routing/qwe', async ({ page, wait_for_text, text }) => {
		assert.equal(await text('h1'), 'qwe');

		await page.click('[href="234"]');

		await wait_for_text('h1', 'Regexp page 234');

		await page.click('[href="regexp/234"]');

		await wait_for_text('h1', 'Nested regexp page 234');
	});

	test(
		'invalidates page when a segment is skipped',
		'/routing/skipped/x/1',
		async ({ page, wait_for_text }) => {
			await wait_for_text('h1', 'x/1');

			await page.click('#goto-y1');

			await wait_for_text('h1', 'y/1');
		}
	);
}
