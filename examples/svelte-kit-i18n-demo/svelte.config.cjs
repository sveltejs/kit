const adapter = require(process.env.ADAPTER || '@sveltejs/adapter-node');
const options = JSON.stringify(process.env.OPTIONS || '{}');

module.exports = {
	kit: {
		adapter: adapter(options),
		target: '#svelte',
		i18n: {
			defaultLocale: 'de',
			fallbackLocale: 'en',
			locales: [
				{
					code: 'de',
					iso: 'de-DE'
				},
				{
					code: 'en',
					iso: 'en-GB'
				}
			]
		}
	}
};
