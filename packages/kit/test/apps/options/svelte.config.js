/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.jesuslivesineveryone', '.whokilledthemuffinman', '.svelte.md', '.svelte'],
	kit: {
		files: {
			assets: 'public',
			lib: 'source/components',
			routes: 'source/pages',
			template: 'source/template.html',
			// while we specify a path for the service worker, we expect it to not exist in the test
			serviceWorker: 'source/service-worker'
		},
		appDir: '_wheee',
		floc: true,
		target: '#content-goes-here',
		host: 'example.com',
		trailingSlash: 'always',
		vite: {
			build: {
				minify: false
			},
			clearScreen: false
		},
		paths: {
			base: '/path-base',
			assets: 'https://cdn.example.com/stuff'
		},
		protocol: 'https'
	}
};

export default config;
