import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test) {
	const tests = [
		{
			description: 'exposes query string parameters',
			search: '?foo=1',
			expected: { foo: '1' }
		},
		{
			description: 'value-less query parameter',
			search: '?foo',
			expected: { foo: '' }
		},
		{
			description: 'duplicated query parameter',
			search: '?key=one&key=two',
			expected: { key: ['one', 'two'] }
		},
		{
			description: 'encoded query parameter',
			search: '?key=%26a=b',
			expected: { key: '&a=b' }
		}
	];

	tests.forEach(({ description, search, expected }) => {
		test(description, `/query/echo${search}`, async ({ page }) => {
			const json = JSON.stringify(expected);

			assert.equal(await page.textContent('#one'), json);
			assert.equal(await page.textContent('#two'), json);
		});
	});

	test('updates page on client-side nav', '/query/echo?foo=1', async ({ page, clicknav }) => {
		await clicknav('[href="/query/echo?bar=2"]');

		const json = JSON.stringify({ bar: '2' });

		assert.equal(await page.textContent('#one'), json);
		assert.equal(await page.textContent('#two'), json);
	});
}
