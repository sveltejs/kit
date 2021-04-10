import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test) {
	test('sets Content-Type', async ({ fetch }) => {
		const { headers } = await fetch('/content-type-header/');

		assert.equal(headers.get('content-type'), 'text/html');
	});
}
