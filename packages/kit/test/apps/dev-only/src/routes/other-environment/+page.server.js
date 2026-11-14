export function load() {
	return {
		// defined in vite.config.js
		// @ts-expect-error
		environment: __TEST_ENVIRONMENT__
	};
}
