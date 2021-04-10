import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test) {
	test('caches pages', async ({ fetch }) => {
		const { headers } = await fetch('/caching/');

		assert.equal(headers.get('cache-control'), 'public, max-age=30');
	});

	test('sets cache-control: private if page uses session', async ({ fetch }) => {
		const { headers } = await fetch('/caching/private/uses-session');

		assert.equal(headers.get('cache-control'), 'private, max-age=30');
	});

	test('sets cache-control: private if page uses fetch', async ({ fetch }) => {
		const { headers } = await fetch('/caching/private/uses-fetch?credentials=include');

		assert.equal(headers.get('cache-control'), 'private, max-age=30');
	});

	test('sets cache-control: public if page uses fetch without credentials', async ({ fetch }) => {
		const { headers } = await fetch('/caching/private/uses-fetch?credentials=omit');

		assert.equal(headers.get('cache-control'), 'public, max-age=30');
	});
}
