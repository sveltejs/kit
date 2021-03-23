import colors from 'kleur';
import { logger } from '../utils.js';
import Builder from './Builder.js';

/**
 * @param {import('../../../types.internal').ValidatedConfig} config
 * @param {{ cwd?: string, verbose: boolean }} opts
 */
export async function adapt(config, { cwd = process.cwd(), verbose }) {
	const { name, adapt } = config.kit.adapter;

	console.log(colors.bold().cyan(`\n> Using ${name}`));

	const log = logger({ verbose });
	const builder = new Builder({ cwd, config, log });
	await adapt(builder);

	log.success('done');
}
