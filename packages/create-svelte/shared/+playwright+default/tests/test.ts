import { expect, test } from '@playwright/test';

test.describe('home page e2e test', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Home/);
    });

    test('user should be able to see welcome page', async ({ page }) => {
        const welcomeScreen = page.getByRole('heading', { name: 'Welcome to your new SvelteKit app' });
		await expect(welcomeScreen).toBeVisible();
    });

    test('user should be able to use the counter', async ({ page }) => {
        await expect(page.getByText('0')).toBeVisible();
		const increaseButton = page.getByRole('button', { name: 'Increase the counter by one' });
		await increaseButton.click({ clickCount: 3});
		await expect(page.getByText('3')).toBeVisible();
		const decreaseButton = page.getByRole('button', { name: 'Decrease the counter by one' });
		await decreaseButton.click({ clickCount: 2});
		await expect(page.getByText('1')).toBeVisible();
    });

});

test.describe('about page e2e test', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/about');
        await expect(page).toHaveTitle(/About/);
    });

    test('user should be able to see about page', async ({ page }) => {
        const headingText = page.textContent('h1');
        expect(await headingText).toBe('About this app');
    });

});
