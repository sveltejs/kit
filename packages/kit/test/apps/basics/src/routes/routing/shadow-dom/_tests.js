import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test(
		'client router captures anchors in shadow dom',
		'/routing/shadow-dom',
		async ({ app, capture_requests, page, clicknav, js }) => {
			if (js) {
				await app.prefetchRoutes(['/routing/a']).catch((e) => {
					// from error handler tests; ignore
					if (!e.message.includes('Crashing now')) throw e;
				});

				const requests = await capture_requests(async () => {
					await clicknav('div[id="clickme"]');
					assert.equal(await page.textContent('h1'), 'a');
				});

				assert.equal(requests, []);
			}
		}
	);
}
