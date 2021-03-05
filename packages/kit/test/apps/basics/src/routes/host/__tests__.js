import * as assert from 'uvu/assert';

export default function (test) {
	test('can access host through page store', async ({ base, text, page }) => {
		page.setExtraHTTPHeaders({
			'x-forwarded-host': 'forwarded.com'
		});

		await page.goto(`${base}/host`);
		assert.equal(await text('h1'), 'forwarded.com');

		// reset
		page.setExtraHTTPHeaders({});
	});
}
