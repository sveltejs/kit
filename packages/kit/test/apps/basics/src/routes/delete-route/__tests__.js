export default function (test) {
	test('calls a delete handler', '/delete-route', async ({ wait_for_text, page, js }) => {
		if (js) {
			await page.click('.del');
			await wait_for_text('h1', 'deleted 42');
		}
	});
}
