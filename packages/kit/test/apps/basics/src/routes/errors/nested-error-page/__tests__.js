import * as assert from 'uvu/assert';

/** @type {import('../../../../../../types').TestMaker} */
export default function (test, is_dev) {
	test(
		'renders the closest error page',
		'/errors/nested-error-page',
		async ({ page, clicknav }) => {
			await clicknav('[href="/errors/nested-error-page/nope"]');

			assert.equal(await page.textContent('h1'), 'Nested error page');
			assert.equal(await page.textContent('#nested-error-status'), 'status: 500');
			assert.equal(await page.textContent('#nested-error-message'), 'error.message: nope');
		}
	);
}
