import colors from 'kleur';
import { logger } from '../utils.js';
import AdapterUtils from './AdapterUtils.js';

/**
 * @param {import('../../../types.internal').ValidatedConfig} config
 * @param {{ cwd?: string, verbose: boolean }} opts
 */
export async function adapt(config, { cwd = process.cwd(), verbose }) {
	if (!config.kit.adapter) {
		console.log(colors.bold().cyan('\nNo adapter specified'));
		console.log('See https://kit.svelte.dev/docs#adapters for more information');
		return;
	}

	const { name, adapt } = config.kit.adapter;

	console.log(colors.bold().cyan(`\n> Using ${name}`));

	const log = logger({ verbose });
	const utils = new AdapterUtils({ cwd, config, log });
	await adapt(utils);

	log.success('done');
}
