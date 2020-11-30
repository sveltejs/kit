import * as assert from 'uvu/assert';

export default function (test) {
	/** @todo Host is not passed. this is a bug. */
	test.skip('can access host through page store', async ({ visit, start, text }) => {
		await visit('/host');
		assert.equal(await text('h1'), 'localhost');

		await start();
		assert.equal(await text('h1'), 'localhost');
	});
}
