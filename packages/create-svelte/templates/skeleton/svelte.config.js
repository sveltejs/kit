import adapters from '@sveltejs/adapter-auto';

// This config is ignored and replaced with one of the configs in the shared folder when a project is created.

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapters()
	}
};

export default config;
