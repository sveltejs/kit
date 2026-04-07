import { sveltekit } from '@sveltejs/kit/vite';
import { svelteKitTest } from '@sveltejs/kit/test/vitest';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit(), svelteKitTest({ mode: 'component' })],
	test: {
		include: ['test/**/*.component.test.{js,ts}'],
		browser: {
			enabled: true,
			provider: playwright(),
			headless: true,
			instances: [{ browser: 'chromium' }]
		}
	}
});
