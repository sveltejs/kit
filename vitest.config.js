import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			'packages/adapter-auto',
			'packages/adapter-cloudflare',
			'packages/adapter-netlify',
			'packages/adapter-node',
			'packages/adapter-vercel',
			'packages/enhanced-img',
			'packages/package',
			'packages/kit/kit.vitest.config.js',
			'packages/kit/test/apps/basics',
			'packages/kit/test/build-errors',
			'packages/kit/test/prerendering/basics'
		]
	}
});
