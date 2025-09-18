import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					root: 'packages/adapter-auto',
					name: 'adapter-auto',
				}
			},
			{
				test: {
					root: 'packages/adapter-cloudflare',
					name: 'adapter-cloudflare',
				}
			},
			{
				test: {
					root: 'packages/adapter-netlify',
					name: 'adapter-netlify',
				}
			},
			{
				test: {
					root: 'packages/adapter-node',
					name: 'adapter-node',
				}
			},
			{
				test: {
					root: 'packages/adapter-vercel',
					name: 'adapter-vercel',
				}
			},
			{
				test: {
					root: 'packages/enhanced-img',
					name: 'enhanced-img',
				}
			},
			{
				test: {
					root: 'packages/package',
					name: 'package'
				}
			},
			// TODO: 'Creates correct $types' test in write_types/index.spec.js does not work because of the wrong cwd
			{
				extends: 'packages/kit/kit.vitest.config.js',
				test: {
					root: 'packages/kit',
					name: 'kit',
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
				test: {
					root: 'packages/kit/test/build-errors',
					name: 'kit-build-errors',
				}
			},
			{
				extends: 'packages/kit/test/prerendering/basics/vite.config.js',
				test: {
					root:'packages/kit/test/prerendering/basics',
					name: 'kit-prerendering-basics',
				}
			}
		]
	}
});
