import { defineConfig } from 'vitest/config';

export default defineConfig({
	root: import.meta.dirname,
	test: {
		projects: [
			'packages/*',
			// prevent Vitest from crawling nested Vite apps in the kit test directory
			// which do not use Vitest but have a vite.config.js file
			'!packages/kit',
			'packages/kit/vitest.kit.config.js',
			'packages/kit/test/apps/async',
			'packages/kit/test/apps/basics',
			'packages/kit/test/apps/options/vite.custom.config.js',
			'packages/kit/test/build-errors',
			'packages/kit/test/prerendering/basics',
			'packages/kit/test/prerendering/options',
			'packages/kit/test/prerendering/paths-base'
		]
	}
});
