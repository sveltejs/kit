import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test, is_dev) {
	test('redirect', async ({ visit, click, pathname, text, js, sleep }) => {
		await visit('/redirect');

		await click('[href="/redirect/a"]');

		if (js) await sleep(50);

		assert.equal(await pathname(), '/redirect/b');
		assert.equal(await text('h1'), 'b');
	});
}
