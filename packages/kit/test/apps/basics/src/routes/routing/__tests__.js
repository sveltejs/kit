import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test) {
	test(
		'redirects from /routing/ to /routing',
		'/routing/slashes',
		async ({ base, page, clicknav, app, js }) => {
			await clicknav('a[href="/routing/"]');
			assert.equal(await page.url(), `${base}/routing`);
			assert.equal(await page.textContent('h1'), 'Great success!');

			if (js) {
				await page.goto(`${base}/routing/slashes`);
				await page.evaluate(() => window.started);
				await app.goto('/routing/');
				assert.equal(await page.url(), `${base}/routing`);
				assert.equal(await page.textContent('h1'), 'Great success!');
			}
		}
	);

	test(
		'redirects from /routing/? to /routing',
		'/routing/slashes',
		async ({ base, page, clicknav, app, js }) => {
			await clicknav('a[href="/routing/?"]');
			assert.equal(await page.url(), `${base}/routing`);
			assert.equal(await page.textContent('h1'), 'Great success!');

			if (js) {
				await page.goto(`${base}/routing/slashes`);
				await page.evaluate(() => window.started);
				await app.goto('/routing/?');
				assert.equal(await page.url(), `${base}/routing`);
				assert.equal(await page.textContent('h1'), 'Great success!');
			}
		}
	);

	test(
		'redirects from /routing/?foo=bar to /routing?foo=bar',
		'/routing/slashes',
		async ({ base, page, clicknav, app, js }) => {
			await clicknav('a[href="/routing/?foo=bar"]');
			assert.equal(await page.url(), `${base}/routing?foo=bar`);
			assert.equal(await page.textContent('h1'), 'Great success!');

			if (js) {
				await page.goto(`${base}/routing/slashes`);
				await page.evaluate(() => window.started);
				await app.goto('/routing/?foo=bar');
				assert.equal(await page.url(), `${base}/routing?foo=bar`);
				assert.equal(await page.textContent('h1'), 'Great success!');
			}
		}
	);

	test('serves static route', '/routing/a', async ({ page }) => {
		assert.equal(await page.textContent('h1'), 'a');
	});

	test('serves static route from dir/index.html file', '/routing/b', async ({ page }) => {
		assert.equal(await page.textContent('h1'), 'b');
	});

	test(
		'serves static route under client directory',
		'/routing/client/foo',
		async ({ base, page }) => {
			assert.equal(await page.textContent('h1'), 'foo');

			await page.goto(`${base}/routing/client/bar`);
			assert.equal(await page.textContent('h1'), 'bar');

			await page.goto(`${base}/routing/client/bar/b`);
			assert.equal(await page.textContent('h1'), 'b');
		}
	);

	test('serves dynamic route', '/routing/test-slug', async ({ page }) => {
		assert.equal(await page.textContent('h1'), 'test-slug');
	});

	test(
		'navigates to a new page without reloading',
		'/routing',
		async ({ app, capture_requests, page, clicknav, js }) => {
			if (js) {
				await app.prefetchRoutes().catch((e) => {
					// from error handler tests; ignore
					if (!e.message.includes('Crashing now')) throw e;
				});

				// weird flakiness — without this, some requests are
				// reported after prefetchRoutes has finished
				await page.waitForTimeout(500);

				const requests = await capture_requests(async () => {
					await clicknav('a[href="/routing/a"]');
					assert.equal(await page.textContent('h1'), 'a');
				});

				assert.equal(requests, []);
			}
		}
	);

	test('navigates programmatically', '/routing/a', async ({ page, app, js }) => {
		if (js) {
			await app.goto('/routing/b');
			assert.equal(await page.textContent('h1'), 'b');
		}
	});

	test('prefetches programmatically', '/routing/a', async ({ base, capture_requests, app, js }) => {
		if (js) {
			const requests = await capture_requests(() => app.prefetch('b'));

			assert.equal(requests.length, 2);
			assert.equal(requests[1], `${base}/routing/b.json`);
		}
	});

	test(
		'does not attempt client-side navigation to server routes',
		'/routing',
		async ({ page, clicknav }) => {
			await clicknav('[href="/routing/ambiguous/ok.json"]');
			assert.equal(await page.textContent('body'), 'ok');
		}
	);

	test('allows reserved words as route names', '/routing/const', async ({ page }) => {
		assert.equal(await page.textContent('h1'), 'reserved words are okay as routes');
	});

	test('resets the active element after navigation', '/routing', async ({ page, clicknav }) => {
		await clicknav('[href="/routing/a"]');
		await page.waitForFunction(() => document.activeElement.nodeName == 'BODY');
	});

	test(
		'navigates between routes with empty parts',
		'/routing/dirs/foo',
		async ({ page, clicknav }) => {
			assert.equal(await page.textContent('h1'), 'foo');
			await clicknav('[href="bar"]');
			assert.equal(await page.textContent('h1'), 'bar');
		}
	);

	test('navigates to ...rest', '/routing/abc/xyz', async ({ page, clicknav }) => {
		assert.equal(await page.textContent('h1'), 'abc/xyz');

		await clicknav('[href="/routing/xyz/abc/def/ghi"]');
		assert.equal(await page.textContent('h1'), 'xyz/abc/def/ghi');
		assert.equal(await page.textContent('h2'), 'xyz/abc/def/ghi');

		await clicknav('[href="/routing/xyz/abc/def"]');
		assert.equal(await page.textContent('h1'), 'xyz/abc/def');
		assert.equal(await page.textContent('h2'), 'xyz/abc/def');

		await clicknav('[href="/routing/xyz/abc"]');
		assert.equal(await page.textContent('h1'), 'xyz/abc');
		assert.equal(await page.textContent('h2'), 'xyz/abc');

		await clicknav('[href="/routing/xyz/abc/deep"]');
		assert.equal(await page.textContent('h1'), 'xyz/abc');
		assert.equal(await page.textContent('h2'), 'xyz/abc');

		await clicknav('[href="/routing/xyz/abc/qwe/deep.json"]');
		assert.equal(await page.textContent('body'), 'xyz/abc/qwe');
	});

	test(
		'navigates between dynamic routes with same segments',
		'/routing/dirs/bar/xyz',
		async ({ page, clicknav }) => {
			assert.equal(await page.textContent('h1'), 'A page');

			await clicknav('[href="/routing/dirs/foo/xyz"]');
			assert.equal(await page.textContent('h1'), 'B page');
		}
	);

	test('find regexp routes', '/routing/qwe', async ({ page, clicknav }) => {
		assert.equal(await page.textContent('h1'), 'qwe');

		await clicknav('[href="234"]');
		assert.equal(await page.textContent('h1'), 'Regexp page 234');

		await clicknav('[href="regexp/234"]');
		assert.equal(await page.textContent('h1'), 'Nested regexp page 234');
	});

	test(
		'invalidates page when a segment is skipped',
		'/routing/skipped/x/1',
		async ({ page, clicknav }) => {
			assert.equal(await page.textContent('h1'), 'x/1');

			await clicknav('#goto-y1');
			assert.equal(await page.textContent('h1'), 'y/1');
		}
	);

	test('back button returns to initial route', '/routing', async ({ page, clicknav }) => {
		await clicknav('[href="/routing/a"]');

		await page.goBack();
		assert.equal(await page.textContent('h1'), 'Great success!');
	});
}
