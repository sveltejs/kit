import * as assert from 'uvu/assert';

export default function (test) {
	test('can access host through page store', async ({ visit, text, set_extra_http_headers }) => {
		set_extra_http_headers({
			'x-forwarded-host': 'forwarded.com'
		});

		await visit('/host');
		assert.equal(await text('h1'), 'forwarded.com');

		// reset
		set_extra_http_headers({});
	});
}
