import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('serves /', '/', async ({ page, response }) => {
		assert.equal(await page.textContent('h1'), 'Hello world!');

		const headers = await response.headers();
		assert.equal(
			headers['X-Request-Locals'],
			JSON.stringify({ first: true, second: 'str', third: 3 })
		);

		assert.equal(headers['X-Handle-Header'], 'hello');
	});
}
