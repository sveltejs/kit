import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test(
		'generates etag/304 for text body',
		null,
		async ({ response, fetch }) => {
			const r1 = await fetch('/etag/text');
			const etag = r1.headers.get('etag');
			assert.ok(!!etag);

			const r2 = await fetch('/etag/text', {
				headers: {
					'if-none-match': etag
				}
			});

			assert.equal(r2.status, 304);
		},
		{
			js: false
		}
	);

	test(
		'generates etag/304 for binary body',
		null,
		async ({ fetch }) => {
			const r1 = await fetch('/etag/binary');
			const etag = r1.headers.get('etag');
			assert.ok(!!etag);

			const r2 = await fetch('/etag/binary', {
				headers: {
					'if-none-match': etag
				}
			});

			assert.equal(r2.status, 304);
		},
		{
			js: false
		}
	);
}
