import colors from 'kleur';
import { logger } from '../utils.js';
import { get_utils } from './utils.js';

/**
 * @param {import('types/config').ValidatedConfig} config
 * @param {import('types/internal').BuildData} build_data
 * @param {{ cwd?: string, verbose: boolean }} opts
 */
export async function adapt(config, build_data, { cwd = process.cwd(), verbose }) {
	if (!config.kit.adapter) return;

	const { name, adapt } = config.kit.adapter;

	console.log(colors.bold().cyan(`\n> Using ${name}`));

	const log = logger({ verbose });
	const utils = get_utils({ cwd, config, build_data, log });
	await adapt({ utils, config });

	log.success('done');
}
