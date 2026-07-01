import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			'packages/*',
			// prevent Vitest from crawling nested Vite apps in the kit test directory
			// which do not use Vitest but have a vite.config.js file
			'!packages/kit',
			{
				extends: 'packages/kit/kit.vitest.config.js',
				root: 'packages/kit'
			},
			{
				extends: 'packages/kit/test/apps/basics/vite.config.js',
				root: 'packages/kit/test/apps/basics'
			},
			'packages/kit/test/build-errors',
			{
				extends: 'packages/kit/test/prerendering/basics/vite.config.js',
				root: 'packages/kit/test/prerendering/basics',
				test: {
					name: 'kit-prerendering-basics'
				}
			}
		]
	}
});
