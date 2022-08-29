import colors from 'kleur';
import { get_path } from '../../utils/routing.js';
import { create_builder } from './builder.js';

/**
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').BuildData} build_data
 * @param {import('types').Prerendered} prerendered
 * @param {{ log: import('types').Logger }} opts
 */
export async function adapt(config, build_data, prerendered, { log }) {
	const { name, adapt } = config.kit.adapter;

	console.log(colors.bold().cyan(`\n> Using ${name}`));

	/** @type {Set<string>} */
	const prerendered_paths = new Set(prerendered.paths);

	const builder = create_builder({
		config,
		build_data,
		routes: build_data.manifest_data.routes.filter((route) => {
			// TODO do this analysis during prerendering — figure out which routes were `prerender = false` or `prerender = 'auto'`
			const path = route.page && get_path(route.id);
			if (path) {
				return !prerendered_paths.has(path) && !prerendered_paths.has(path + '/');
			}

			return true;
		}),
		prerendered,
		log
	});
	await adapt(builder);

	log.success('done');
}
