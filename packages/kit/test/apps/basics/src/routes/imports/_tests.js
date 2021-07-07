import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('imports from node_modules', '/imports', async ({ page, clicknav }) => {
		await clicknav('[href="/imports/markdown"]');
		assert.equal((await page.innerHTML('p')).trim(), 'this is some <strong>markdown</strong>');
	});
}
