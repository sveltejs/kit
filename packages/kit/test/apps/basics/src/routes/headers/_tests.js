import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('disables floc by default', '/headers', async ({ response }) => {
		const headers = response.headers();
		assert.equal(headers['permissions-policy'], 'interest-cohort=()');
	});
}
