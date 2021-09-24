import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('test get_elements behavior', '/iframe', async ({ page, clicknav, get_elements }) => {
		const main_frame = await get_elements('div[data-test]');
		assert.equal(main_frame.length, 1);
		const frames = await get_elements('div[data-test]', true);
		assert.equal(frames.length, 4);
	});
}
