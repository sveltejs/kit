import relative from 'require-relative';

const default_options = {
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
	const { kitOptions = {} } = relative('./svelte.config.js', cwd);

	return {
		...default_options,
		...kitOptions,
		paths: {
			...default_options.paths,
			...kitOptions.paths
		}
	};
}
