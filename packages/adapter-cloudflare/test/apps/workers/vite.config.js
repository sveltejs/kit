import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-cloudflare';
import assert from 'node:assert/strict';

let server_builds = 0;

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false,
		sourcemap: true
	},
	plugins: [
		sveltekit({
			adapter: adapter({
				config: 'config/wrangler.jsonc'
			}),
			paths: { base: process.env.TEST_BASE ? '/base' : '' }
		}),
		{
			name: 'test-cloudflare-ssr-build',
			apply: 'build',
			buildStart() {
				if (this.environment.name !== 'ssr') return;
				assert.equal(++server_builds, 1);
				assert.ok(this.environment.config.resolve.conditions.includes('workerd'));
				assert.equal(this.environment.config.resolve.noExternal, true);
			}
		}
	]
};

export default config;
