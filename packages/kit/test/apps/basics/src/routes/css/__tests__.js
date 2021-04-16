import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test) {
	test('applies imported styles', '/css', async ({ page }) => {
		assert.equal(
			await page.evaluate(() => getComputedStyle(document.querySelector('.styled')).color),
			'rgb(255, 0, 0)'
		);
	});

	test('applies layout styles', '/css', async ({ page }) => {
		assert.equal(
			await page.evaluate(() => getComputedStyle(document.querySelector('footer')).color),
			'rgb(128, 0, 128)'
		);
	});

	test('applies local styles', '/css', async ({ page }) => {
		assert.equal(
			await page.evaluate(() => getComputedStyle(document.querySelector('.also-styled')).color),
			'rgb(0, 0, 255)'
		);
	});

	test(
		'applies generated component styles (hides announcer)',
		'/css',
		async ({ page, clicknav, js }) => {
			if (js) {
				await clicknav('[href="/css/other"]');

				assert.equal(
					await page.evaluate(
						() => getComputedStyle(document.querySelector('#svelte-announcer')).position
					),
					'absolute'
				);
			}
		}
	);
}
