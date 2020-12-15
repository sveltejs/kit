import * as assert from 'uvu/assert';

export default function (test) {
	test('caches pages', async ({ fetch }) => {
		const { headers } = await fetch('/caching');

		assert.equal(headers.get('cache-control'), 'public, max-age=30');
	});

	test('sets cache-control: private if page uses session', async ({ fetch }) => {
		const { headers } = await fetch('/caching/private');

		assert.equal(headers.get('cache-control'), 'private, max-age=30');
	});
}
