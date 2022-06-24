import colors from 'kleur';
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

	const builder = create_builder({ config, build_data, prerendered, log });
	await adapt(builder);

	log.success('done');
}
