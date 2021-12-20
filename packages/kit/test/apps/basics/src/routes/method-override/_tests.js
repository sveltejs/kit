import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('http method is overridden via URL parameter', '/method-override', async ({ page }) => {
		let val;

		// Check initial value
		val = await page.textContent('h1');
		assert.equal('', val);

		await page.click('"PATCH"');
		val = await page.textContent('h1');
		assert.equal('PATCH', val);

		await page.click('"DELETE"');
		val = await page.textContent('h1');
		assert.equal('DELETE', val);
	});

	test('GET method is not overridden', '/method-override', async ({ page }) => {
		await page.click('"No Override From GET"');
		const val = await page.textContent('h1');
		assert.equal('GET', val);
	});

	test('http method is overridden via hidden input', '/method-override', async ({ page }) => {
		await page.click('"PATCH Via Hidden Input"');
		const val = await page.textContent('h1');
		assert.equal('PATCH', val);
	});

	test('GET method is not overridden via hidden input', '/method-override', async ({ page }) => {
		await page.click('"No Override From GET Via Hidden Input"');
		const val = await page.textContent('h1');
		assert.equal('GET', val);
	});
}
