import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('endpoints can shadow pages', '/routing/shadow', async ({ page, clicknav }) => {
		const random = String(Math.random());

		await page.evaluate((random) => {
			const el = document.querySelector('input');
			if (!el) throw new Error('Could not find input');
			el.value = random;
		}, random);

		await clicknav('button');

		assert.equal(await page.textContent('h1'), random);
	});
}
