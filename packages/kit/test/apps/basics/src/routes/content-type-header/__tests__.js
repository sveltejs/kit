import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('sets Content-Type', null, async ({ fetch }) => {
		const { headers } = await fetch('/content-type-header');

		assert.equal(headers.get('content-type'), 'text/html');
	});
}
