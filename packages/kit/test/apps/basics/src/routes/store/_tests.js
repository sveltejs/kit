import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('page store functions as expected', null, async ({ base, page, clicknav, js }) => {
		await page.goto(`${base}/store`);

		assert.equal(await page.textContent('h1'), 'Test');
		assert.equal(await page.textContent('h2'), 'Calls: 1');

		await clicknav('a[href="/store/result"]');
		assert.equal(await page.textContent('h1'), 'Result');
		assert.equal(await page.textContent('h2'), js ? 'Calls: 1' : 'Calls: 0');

		const oops = await page.evaluate(() => window.oops);
		assert.ok(!oops, oops);
	});

	test(
		'navigating store contains from and to',
		'/store/navigating/a',
		async ({ app, page, js }) => {
			assert.equal(await page.textContent('#navigating'), 'not currently navigating');

			if (js) {
				await app.prefetchRoutes(['/store/navigating/b']);
				await page.click('a[href="/store/navigating/b"]');

				assert.equal(
					await page.textContent('#navigating'),
					'navigating from /store/navigating/a to /store/navigating/b'
				);

				await page.waitForSelector('#not-navigating');
				assert.equal(await page.textContent('#navigating'), 'not currently navigating');
			}
		}
	);
}
