import { join } from 'path';

/** @type {import('@sveltejs/kit/adapter').AppResolver} */
export function appResolver() {
	return {
		name: '@sveltejs/esbuild-plugin-app-resolver',
		setup(build) {
			build.onResolve({ filter: /@sveltejs\/kit\/app/ }, (args) => ({
				path: join(args.resolveDir, '../output/server/app.js')
			}));
		}
	};
}
