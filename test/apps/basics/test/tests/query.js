import * as assert from 'uvu/assert';

export default function (test) {
	const assert_query_echoed = (query, parsed) => async ({ visit, html }) => {
		await visit(`/query/echo${query}`);

		assert.equal(await html('#one'), JSON.stringify(parsed));
		assert.equal(await html('#two'), JSON.stringify(parsed));
	};

	test('exposes query string parameters', assert_query_echoed('?foo=1', { foo: '1' }));

	test('value-less query parameter', assert_query_echoed('?foo', { foo: '' }));

	test(
		'duplicated query parameter',
		assert_query_echoed('?key=one&key=two', { key: ['one', 'two'] })
	);

	/** @todo this is currently not working and should be fixed. */
	test.skip('encoded query parameter', assert_query_echoed('?key=%26a=b', { key: '&' }));
}
