import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.describe.configure({ mode: 'parallel' });

test.describe('subresourceIntegrity', () => {
	test.skip(() => !!process.env.DEV);

	test('adds integrity attribute to script preloads', async ({ request }) => {
		const response = await request.get('/');
		const html = await response.text();

		// All preloaded scripts should have integrity attributes
		const link_tags = html.match(/<link[^>]+>/g) ?? [];
		const script_links = link_tags.filter(
			(tag) => tag.includes('as="script"') || tag.includes('rel="modulepreload"')
		);

		expect(script_links.length).toBeGreaterThan(0);

		for (const tag of script_links) {
			expect(tag).toMatch(/integrity="sha384-[A-Za-z0-9+/=]+"/);
			expect(tag).toContain('crossorigin="anonymous"');
		}
	});

	test('adds integrity attribute to stylesheet links', async ({ request }) => {
		const response = await request.get('/styled');
		const html = await response.text();

		const link_tags = html.match(/<link[^>]+>/g) ?? [];
		const stylesheet_links = link_tags.filter((tag) => tag.includes('rel="stylesheet"'));

		expect(stylesheet_links.length).toBeGreaterThan(0);

		for (const tag of stylesheet_links) {
			expect(tag).toMatch(/integrity="sha384-[A-Za-z0-9+/=]+"/);
			expect(tag).toContain('crossorigin="anonymous"');
		}
	});

	test('sets integrity-policy response header', async ({ request }) => {
		const response = await request.get('/');
		const header = response.headers()['integrity-policy'];

		expect(header).toBe('blocked-destinations=(script style),endpoints=(default)');
	});
});
