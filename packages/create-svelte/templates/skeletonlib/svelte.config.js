import adapter from '@sveltejs/adapter-auto';

// This config is ignored and replaced with one of the configs in the shared folder when a project is created.

/** @type {import('@sveltejs/package').Config} */
const config = {
	kit: {
		adapter: adapter()
	}
};

export default config;
