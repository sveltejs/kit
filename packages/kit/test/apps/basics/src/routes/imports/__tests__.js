import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test) {
	test('imports from node_modules', '/imports', async ({ page, clicknav }) => {
		await clicknav('[href="/imports/markdown"]');
		assert.equal(
			(await page.innerHTML('main')).trim(),
			'<p>this is some <strong>markdown</strong></p>'
		);
	});
}
