import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test.only('not ok on void endpoint', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/empty', { method: 'DELETE' });
		assert.equal(res.ok, false);
	});
	test.only('200 status on empty endpoint', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/empty');
		assert.equal(res.status, 200);
		assert.equal(await res.json(), {});
	});

	test.only('set-cookie without body', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/headers');
		assert.equal(res.status, 200);
		assert.equal(res.headers.has('set-cookie'), true);
	});

	test.only('200 status by default', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/body');
		assert.equal(res.status, 200);
		assert.equal(await res.text(), '{}');
	});
}
