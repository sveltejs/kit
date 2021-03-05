import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test) {
	// We decided not to keep this behaviour. Leaving the skipped test here for now
	// in case we change our minds
	test.skip('runs server route handlers before page handlers, if they match', async ({ fetch }) => {
		const res = await fetch('/middleware', {
			headers: { Accept: 'application/json' }
		});

		assert.equal(await res.json(), { json: true }, 'Expected a JSON response');

		const html = await fetch('/middleware');

		assert.ok((await html.text()).indexOf('<h1>HTML</h1>') !== -1, 'Expected an HTML response');
	});
}
