
	test('server-side error from load() still has layout data', async ({ page }) => {
		await page.goto('/errors/load-error-server/layout-data');
		expect(await page.textContent('#error-layout-data')).toBe('42');
	});
