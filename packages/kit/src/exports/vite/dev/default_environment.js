import { createNodeDevEnvironment } from 'vite';

/**
 *
 * @returns {(environment_name: string) => import('vite').Plugin[]}
 */
export function node() {
	// @ts-ignore
	return function default_environment(environment_name) {
		return [
			{
				name: 'default-environment-plugin',
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
