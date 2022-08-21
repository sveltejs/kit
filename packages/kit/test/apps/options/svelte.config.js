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
		// IDEA: We could use svelte-preprocess to create the needed config for preprocessing `sveltekit:*`
		// TODO: Update regex to only match attributes and not all string values, to prevent it from replacing text content.
		// preprocess({
		// 	// TODO: Find a way to create a combined preprocess() inside of sveltekit.
		// 	// This works perfectly, but we shouldn't have to expose this detail to app developers. There must be a way to combine it.
		// 	replace: [
		// 		[/sveltekit\:attribute/g, 'data-sveltekit-attribute'],
		// 		[/sveltekit\:prefetch/g, 'data-sveltekit-prefetch']
		// 	]
		// })
	]
};

export default config;
