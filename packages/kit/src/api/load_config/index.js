import relative from 'require-relative';

const default_config = {
	target: null,
	startGlobal: null, // used for testing
	paths: {
		static: 'static',
		routes: 'src/routes',
		setup: 'src/setup',
		template: 'src/app.html'
	}
};

export function load_config({ cwd = process.cwd() } = {}) {
	const config = relative('./svelte.config.js', cwd);

	return {
		...default_config,
		...config,
		paths: {
			...default_config.paths,
			...config.paths
		}
	};
}
