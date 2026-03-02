import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{
				root: 'packages/adapter-auto',
				test: {
					name: 'adapter-auto',
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
				extends: 'packages/kit/kit.vitest.config.js',
				root: 'packages/kit',
				test: {
					name: 'kit'
				}
			},
			// TODO: uncomment this when cwd is set correctly
			// {
			// 	extends: 'packages/kit/test/apps/basics/vite.config.js',
			// 	test: {
			// 		root: 'packages/kit/test/apps/basics',
			// 		name: 'kit-apps-basics',
			// 	}
			// },
			{
				root: 'packages/kit/test/build-errors',
				test: {
					name: 'kit-build-errors'
				}
			},
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
