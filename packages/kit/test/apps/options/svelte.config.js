import process from 'node:process';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.jesuslivesineveryone', '.whokilledthemuffinman', '.svelte.md', '.svelte'],
	kit: {
		embedded: true,
		csp: {
			directives: {
				'script-src': ['self'],
				'require-trusted-types-for': ['script']
			}
		},
		files: {
			assets: 'public',
			lib: 'source/components',
			routes: 'source/pages',
			appTemplate: 'source/template.html',
			hooks: {
				client: 'source/hooks.client.js',
				server: 'source/hooks.server.js'
			},
			// while we specify a path for the service worker, we expect it to not exist in the test
			serviceWorker: 'source/service-worker'
		},
		appDir: '_wheee/nested',
		inlineStyleThreshold: 1024,
		outDir: '.custom-out-dir',
		paths: {
			base: '/path-base',
			// @ts-expect-error our env var string can't match the https template literal
			assets: process.env.PATHS_ASSETS || ''
		},
		env: {
			dir: './env-dir',
			publicPrefix: 'GO_AWAY_',
			privatePrefix: 'TOP_SECRET_SHH'
		},
		router: {
			resolution: /** @type {'client' | 'server'} */ (process.env.ROUTER_RESOLUTION) || 'client'
		}
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
