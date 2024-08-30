import { createNodeDevEnvironment } from 'vite';

/**
 * @param {string} environment_name
 * @returns {import('vite').Plugin[]}
 */
export function default_environment(environment_name) {
	return [
		{
			name: 'default-environment-plugin',
			// @ts-ignore should the options parameter for createNodeDevEnvironment be optional?
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
}
