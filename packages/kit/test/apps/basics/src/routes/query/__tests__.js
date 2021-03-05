import * as assert from 'uvu/assert';

export default function (test) {
	const assert_query_echoed = (query, parsed) => async ({ base, page }) => {
		await page.goto(`${base}/query/echo${query}`);

		const json = JSON.stringify(parsed);

		assert.equal(await page.textContent('#one'), json);
		assert.equal(await page.textContent('#two'), json);
	};

	test('exposes query string parameters', assert_query_echoed('?foo=1', { foo: '1' }));

	test('value-less query parameter', assert_query_echoed('?foo', { foo: '' }));

	test(
		'duplicated query parameter',
		assert_query_echoed('?key=one&key=two', { key: ['one', 'two'] })
	);

	test('encoded query parameter', assert_query_echoed('?key=%26a=b', { key: '&a=b' }));
}
