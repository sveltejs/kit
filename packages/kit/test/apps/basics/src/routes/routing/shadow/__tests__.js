import * as assert from 'uvu/assert';

/** @type {import('../../../../../../types').TestMaker} */
export default function (test) {
	test('endpoints can shadow pages', '/routing/shadow', async ({ page, clicknav }) => {
		const random = String(Math.random());

		await page.evaluate((random) => {
			document.querySelector('input').value = random;
		}, random);

		await clicknav('button');

		assert.equal(await page.textContent('h1'), random);
	});
}
