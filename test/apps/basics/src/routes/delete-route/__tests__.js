export default function (test) {
	test('calls a delete handler', async ({ visit, wait_for_text, click, js }) => {
		if (js) {
			await visit('/delete-route');

			await click('.del');
			await wait_for_text('h1', 'deleted 42');
		}
	});
}
