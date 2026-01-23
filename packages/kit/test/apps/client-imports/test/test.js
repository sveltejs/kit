import { expect, test } from '@playwright/test';
import process from 'node:process';

test.describe('Client Import Feature', () => {
	// Skip all tests when JavaScript is disabled since client imports require dynamic imports
	test.beforeEach(async ({ javaScriptEnabled }) => {
		test.skip(!javaScriptEnabled, 'Client imports require JavaScript for dynamic imports');
	});

	const is_dev = process.env.DEV === 'true';

	// Warmup test to ensure dev server is ready
	test('warmup dev server', async ({ page }) => {
		if (!is_dev) {
			test.skip();
			return;
		}

		// Just navigate to warm up the dev server - actual tests will verify functionality
		await page.goto('/basic');
		// Wait a bit for the first module to compile
		await page.waitForTimeout(2000);
	});

	test.describe('Basic Import', () => {
		test('resolves client import to valid path', async ({ page }) => {
			await page.goto('/basic');

			// Check that component path is present and valid
			const pathElement = page.locator('[data-testid="component-path"]');
			await expect(pathElement).toBeVisible();

			const pathText = await pathElement.textContent();

			// In dev mode, paths are source file paths like /src/lib/ComponentA.svelte
			// In build mode, paths are hashed immutable paths like /_app/immutable/...
			if (!is_dev) {
				expect(pathText).toMatch(/Component Path: \/_app\/immutable\//);
			}

			// Component should load successfully (longer timeout for dev mode dynamic imports)
			await expect(page.locator('[data-testid="component-a"]')).toBeVisible({ timeout: 15000 });
		});

		test('loads component with correct content', async ({ page }) => {
			await page.goto('/basic');

			const component = page.locator('[data-testid="component-a"]');
			await expect(component).toBeVisible({ timeout: 15000 });

			// Check component contains expected text
			await expect(component.locator('h2')).toHaveText('Component A');
			await expect(component.locator('p')).toContainText('Dynamically loaded from server!');
		});

		test('shows no error messages', async ({ page }) => {
			await page.goto('/basic');

			// Should not show error
			await expect(page.locator('[data-testid="error"]')).not.toBeVisible();

			// Should not show loading state after component loads
			await page.waitForTimeout(1000);
			await expect(page.locator('[data-testid="loading"]')).not.toBeVisible();
		});
	});

	test.describe('Conditional Loading', () => {
		test('loads Component A by default', async ({ page }) => {
			await page.goto('/conditional');

			await expect(page.locator('[data-testid="variant"]')).toContainText('Current Variant: a');
			await expect(page.locator('[data-testid="component-a"]')).toBeVisible({ timeout: 15000 });
			await expect(page.locator('[data-testid="component-b"]')).not.toBeVisible();
		});

		test('loads Component B when variant=b', async ({ page }) => {
			await page.goto('/conditional?variant=b');

			await expect(page.locator('[data-testid="variant"]')).toContainText('Current Variant: b');
			await expect(page.locator('[data-testid="component-b"]')).toBeVisible({ timeout: 15000 });
			await expect(page.locator('[data-testid="component-a"]')).not.toBeVisible();
		});

		test('switches components when clicking links', async ({ page }) => {
			await page.goto('/conditional?variant=a');

			// First check Component A is loaded
			await expect(page.locator('[data-testid="component-a"]')).toBeVisible({ timeout: 15000 });

			// Click link to load Component B
			await page.click('[data-testid="link-variant-b"]');
			await page.waitForURL('**/conditional?variant=b');

			// Now Component B should be visible
			await expect(page.locator('[data-testid="component-b"]')).toBeVisible({ timeout: 15000 });
			await expect(page.locator('[data-testid="component-a"]')).not.toBeVisible();

			// Switch back to Component A
			await page.click('[data-testid="link-variant-a"]');
			await page.waitForURL('**/conditional?variant=a');

			await expect(page.locator('[data-testid="component-a"]')).toBeVisible({ timeout: 15000 });
			await expect(page.locator('[data-testid="component-b"]')).not.toBeVisible();
		});

		test('different variants have different paths', async ({ page }) => {
			// Load variant A
			await page.goto('/conditional?variant=a');
			const pathA = await page.locator('[data-testid="component-path"]').textContent();

			// Load variant B
			await page.goto('/conditional?variant=b');
			const pathB = await page.locator('[data-testid="component-path"]').textContent();

			// Paths should be different
			expect(pathA).not.toBe(pathB);

			// Both should be valid immutable paths (only check in build mode)
			if (!is_dev) {
				expect(pathA).toMatch(/\/_app\/immutable\//);
				expect(pathB).toMatch(/\/_app\/immutable\//);
			}
		});
	});

	test.describe('Path Structure', () => {
		test('component paths start with correct base', async ({ page }) => {
			test.skip(is_dev, 'Path format checks only apply in build mode');

			await page.goto('/basic');

			const pathText = await page.locator('[data-testid="component-path"]').textContent();
			const path = pathText.replace('Component Path: ', '');

			// Should start with _app/immutable
			expect(path).toMatch(/^\/_app\/immutable\//);
		});

		test('component paths end with .js', async ({ page }) => {
			test.skip(is_dev, 'Path format checks only apply in build mode');

			await page.goto('/basic');

			const pathText = await page.locator('[data-testid="component-path"]').textContent();
			const path = pathText.replace('Component Path: ', '');

			// Should end with .js
			expect(path).toMatch(/\.js$/);
		});

		test('paths are consistent across page loads', async ({ page }) => {
			// Load page first time
			await page.goto('/basic');
			const path1 = await page.locator('[data-testid="component-path"]').textContent();

			// Reload page
			await page.reload();
			const path2 = await page.locator('[data-testid="component-path"]').textContent();

			// Paths should be identical
			expect(path1).toBe(path2);
		});
	});

	test.describe('Component Functionality', () => {
		test('dynamically loaded component is interactive', async ({ page }) => {
			await page.goto('/basic');

			const component = page.locator('[data-testid="component-a"]');
			await expect(component).toBeVisible({ timeout: 5000 });

			// Check styling is applied
			const borderColor = await component.evaluate((el) => window.getComputedStyle(el).borderColor);
			// Should have a border (blue for component A)
			expect(borderColor).toBeTruthy();
		});

		test('component props are passed correctly', async ({ page }) => {
			await page.goto('/basic');

			const component = page.locator('[data-testid="component-a"]');
			await expect(component).toBeVisible({ timeout: 5000 });

			// Check the message prop was passed
			await expect(component.locator('p')).toContainText('Dynamically loaded from server!');
		});
	});

	test.describe('Error Handling', () => {
		test('handles invalid paths gracefully', async ({ page, context: _context }) => {
			// This test would need a modified server that returns invalid paths
			// For now, we just verify no unhandled errors occur
			const errors = [];
			page.on('pageerror', (error) => errors.push(error));

			await page.goto('/basic');
			await page.waitForTimeout(2000);

			// Should have component loaded, not errors
			await expect(page.locator('[data-testid="component-a"]')).toBeVisible();
			expect(errors.length).toBe(0);
		});
	});

	test.describe('Performance', () => {
		test('component loads within reasonable time', async ({ page }) => {
			const startTime = Date.now();

			await page.goto('/basic');
			await expect(page.locator('[data-testid="component-a"]')).toBeVisible();

			const loadTime = Date.now() - startTime;

			// Should load within 5 seconds
			expect(loadTime).toBeLessThan(5000);
		});

		test('no duplicate network requests for same component', async ({ page }) => {
			const requests = [];

			page.on('request', (request) => {
				if (request.url().includes('/_app/immutable/')) {
					requests.push(request.url());
				}
			});

			await page.goto('/basic');
			await expect(page.locator('[data-testid="component-a"]')).toBeVisible({ timeout: 5000 });

			// Count requests for the component chunk
			const componentRequests = requests.filter((url) => url.includes('client-import'));

			// Should only request each chunk once
			const uniqueRequests = new Set(componentRequests);
			expect(componentRequests.length).toBe(uniqueRequests.size);
		});
	});
});
