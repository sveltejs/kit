import * as assert from 'uvu/assert';

export default function (test) {
	test('works with arbitrary extensions', '/', async ({ text }) => {
		assert.equal(await text('h1'), 'Great success!');
	});

	test('works with other arbitrary extensions', '/const', async ({ visit, text }) => {
		assert.equal(await text('h1'), 'Tremendous!');

		await visit('/a');

		assert.equal(await text('h1'), 'a');

		await visit('/test-slug');

		assert.equal(await text('h1'), 'TEST-SLUG');

		await visit('/unsafe-replacement');

		assert.equal(await text('h1'), 'Bazooom!');
	});
}
