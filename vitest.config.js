import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{
				root: 'packages/adapter-auto',
				test: {
					name: 'adapter-auto'
				}
			},
			{
				root: 'packages/adapter-cloudflare',
				test: {
					name: 'adapter-cloudflare'
				}
			},
			{
				root: 'packages/adapter-netlify',
				test: {
					name: 'adapter-netlify'
				}
			},
			{
				root: 'packages/adapter-node',
				test: {
					name: 'adapter-node'
				}
			},
			{
				root: 'packages/adapter-vercel',
				test: {
					name: 'adapter-vercel'
				}
			},
			{
				root: 'packages/enhanced-img',
				test: {
					name: 'enhanced-img'
				}
			},
			{
				root: 'packages/package',
				test: {
					name: 'package'
				}
			},
			{
				root: 'packages/kit',
				extends: 'kit.vitest.config.js',
				test: {
					name: 'kit'
				}
			},
			{
				root: 'packages/kit/test/apps/basics',
				extends: 'vite.config.js',
				test: {
					name: 'kit-apps-basics'
				}
			},
			{
				root: 'packages/kit/test/build-errors',
				extends: 'vitest.config.js',
				test: {
					name: 'kit-build-errors'
				}
			},

			{
				root: 'packages/kit/test/prerendering/basics',
				extends: 'vite.config.js',
				test: {
					name: 'kit-prerendering-basics'
				}
			}
		]
	}
});
