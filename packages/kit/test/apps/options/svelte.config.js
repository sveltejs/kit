import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.jesuslivesineveryone', '.whokilledthemuffinman', '.svelte.md', '.svelte'],
	kit: {
		csp: {
			directives: {
				'script-src': ['self']
			}
		},
		files: {
			assets: 'public',
			lib: 'source/components',
			routes: 'source/pages',
			template: 'source/template.html',
			// while we specify a path for the service worker, we expect it to not exist in the test
			serviceWorker: 'source/service-worker'
		},
		appDir: '_wheee',
		inlineStyleThreshold: 1024,
		outDir: '.custom-out-dir',
		trailingSlash: 'always',
		paths: {
			base: '/path-base',
			assets: 'https://cdn.example.com/stuff'
		}
	},
	preprocess: [
		// Test how combined user preprocessing works together with internal sveltekit preprocessing.
		preprocess({
			replace: [
				[/sveltekit\:attribute/g, 'data-sveltekit-attribute'],
				[/sveltekit\:something/g, 'data-sveltekit-something']
			]
		})
	]
};

export default config;
