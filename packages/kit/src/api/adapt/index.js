import colors from 'kleur';
import relative from 'require-relative';
import { logger } from '../utils';
import Builder from './Builder';

export async function adapt(config) {
	const [adapter, options] = config.adapter;

	if (!adapter) {
		throw new Error('No adapter specified');
	}

	const log = logger();

	console.log(colors.bold().cyan(`\n> Using ${adapter}`));

	const builder = new Builder({
		generated_files: '.svelte/build/optimized',
		config,
		log
	});

	const fn = relative(adapter);
	await fn(builder, options);

	log.success('done');
}
