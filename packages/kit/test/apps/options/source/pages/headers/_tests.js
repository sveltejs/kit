import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('enables floc', '/base-path/headers/', async ({ response }) => {
		const headers = response.headers();
		assert.equal(headers['permissions-policy'], undefined);
	});
}
