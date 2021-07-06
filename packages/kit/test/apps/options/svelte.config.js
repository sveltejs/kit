/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.jesuslivesineveryone', '.whokilledthemuffinman', '.svelte.md', '.svelte'],
	kit: {
		files: {
			assets: 'public',
			lib: 'source/components',
			routes: 'source/pages',
			template: 'source/template.html'
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
			clearScreen: false,
			server: {
				fs: {
					strict: true
				}
			}
		}
	}
};

export default config;
