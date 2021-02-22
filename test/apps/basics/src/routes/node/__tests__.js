import * as assert from 'uvu/assert';

export default function (test) {
	test('allow import from node', async ({ visit, js }) => {
		if (!js) {
			const response = await visit('/node');
			assert.ok(response.ok(), 'Should not have server error');
		}
	});
}
