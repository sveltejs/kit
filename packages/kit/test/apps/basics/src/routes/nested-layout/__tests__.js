import * as assert from 'uvu/assert';

export default function (test) {
	test('renders a nested layout', '/nested-layout', async ({ contains }) => {
		assert.ok(await contains('Custom layout'));
		assert.ok(await contains('This is a nested layout component'));
		assert.ok(await contains('Hello from inside the nested layout component'));
	});
}
