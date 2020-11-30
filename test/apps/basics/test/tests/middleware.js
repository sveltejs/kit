import * as assert from 'uvu/assert';

export default function (test) {
	/** @todo Kit is not exposing the headers. Should probably be added to req */
	test.skip('runs server route handlers before page handlers, if they match', async ({ fetch }) => {
		const res = await fetch('/middleware', {
			headers: { Accept: 'application/json' }
		});

		assert.equal(await res.json(), { json: true });

		const html = await fetch('/middleware');

		assert.ok((await html.text()).indexOf('<h1>HTML</h1>') !== -1);
	});
}
