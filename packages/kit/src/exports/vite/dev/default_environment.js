import { createNodeDevEnvironment } from 'vite';

/**
 * A default Node environment to pass to kit.environments.ssr in the Svelte config. This could eventually be used as the fallback for this option.
 * @returns {(environment_name: string) => import('vite').Plugin[]}
 */
export function node() {
	// @ts-ignore
	return function default_environment(environment_name) {
		return [
			{
				name: 'vite-plugin-sveltekit-default-environment',
				config: () => {
					return {
						environments: {
							[environment_name]: {
								dev: {
									createEnvironment: createNodeDevEnvironment
								}
							}
						}
					};
				}
			}
		];
	};
}
