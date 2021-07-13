import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('not ok on void endpoint', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/empty', { method: 'DELETE' });
		assert.equal(res.ok, false);
	});
	test('200 status on empty endpoint', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/empty');
		assert.equal(res.status, 200);
		assert.equal(await res.json(), {});
	});

	test('set-cookie without body', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/headers');
		assert.equal(res.status, 200);
		assert.equal(res.headers.has('set-cookie'), true);
	});

	test('200 status by default', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/body');
		assert.equal(res.status, 200);
		assert.equal(await res.text(), '{}');
	});

	test('does not throw on blob method', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/empty');
		assert.type(await res.blob(), 'object');
	});
	test('does not throw on arrayBuffer method', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/empty');
		assert.type(await res.arrayBuffer(), 'object');
	});
	test('does not throw on buffer method', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/empty');
		assert.type(await res.buffer(), 'object');
	});

	test('null body returns null json value', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/null');
		assert.equal(res.status, 200);
		assert.equal(await res.json(), null);
	});

	test('gets string response with XML Content-Type', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/xml-text');

		assert.equal(res.headers.get('content-type'), 'application/xml');
		assert.equal(await res.text(), '<foo />');
	});

	test.only('gets binary response with XML Content-Type', null, async ({ fetch }) => {
		const res = await fetch('/endpoint-output/xml-bytes');

		assert.equal(res.headers.get('content-type'), 'application/xml');
		assert.equal(await res.text(), '<foo />');
	});
}
