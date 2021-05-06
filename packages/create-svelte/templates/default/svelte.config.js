import preprocess from 'svelte-preprocess';

const adapter = process.env.ADAPTER;
const options = JSON.parse(process.env.OPTIONS || '{}');

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess(),

	kit: {
		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte'
	}
};

if (adapter) {
	config.kit.adapter = (await import(adapter)).default(options);
}

export default config;
