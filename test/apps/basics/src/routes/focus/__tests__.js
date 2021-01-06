import * as assert from 'uvu/assert';

export default function (test) {
	test.only('resets focus', async ({ visit, click, keyboard, evaluate, contains }) => {
		await visit('/focus/a');

		await click('[href="/focus/b"]');
		assert.ok(await contains('b'));
		assert.equal(await evaluate(() => document.activeElement.nodeName), 'BODY');
		await keyboard.press('Tab');
		assert.equal(await evaluate(() => document.activeElement.nodeName), 'A');
		assert.equal(await evaluate(() => document.activeElement.textContent), 'a');

		await click('[href="/focus/a"]');
		assert.ok(await contains('a'));
		assert.equal(await evaluate(() => document.activeElement.nodeName), 'BODY');
		await keyboard.press('Tab');
		assert.equal(await evaluate(() => document.activeElement.nodeName), 'A');
		assert.equal(await evaluate(() => document.activeElement.textContent), 'a');
	});
}
