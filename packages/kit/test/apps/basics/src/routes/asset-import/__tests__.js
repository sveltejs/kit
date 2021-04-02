import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test, is_dev) {
	test('handles static asset imports', '/asset-import', async ({ base, page, js }) => {
		const sources = await page.evaluate(() =>
			[...document.querySelectorAll('img')].map((img) => img.src)
		);

		if (is_dev) {
			assert.equal(sources, [
				`${base}/src/routes/asset-import/small.png`,
				`${base}/src/routes/asset-import/large.jpg`
			]);
		} else {
			assert.ok(sources[0].startsWith('data:image/png;base64,'));
			assert.equal(sources[1].replace(base, ''), '/_app/assets/large.3183867c.jpg');
		}
	});
}
