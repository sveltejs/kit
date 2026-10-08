import { test } from '../../../../utils.js';
import { expect } from '../../../../playwright-matchers.js';

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

for (const mode of ['ssr', 'no-ssr']) {
	test(`initializes dynamic public env in recursive code splitting groups (${mode})`, async ({
		page
	}) => {
		await page.goto(`/code-splitting${mode === 'no-ssr' ? '/no-ssr' : ''}`);
		await expect(page.locator('#dynamic-public')).toHaveText(
			'accessible anywhere/evaluated at run time'
		);

		await page.locator('#go').click();
		await expect(page.locator('h1')).toHaveText('other');
		await expect(page.locator('#dynamic-public')).toHaveText(
			'accessible anywhere/evaluated at run time'
		);
	});
}
