/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',
		i18n: {
			defaultLocale: 'en',
			locales: ['en', 'de']
		}
	}
};

export default config;
