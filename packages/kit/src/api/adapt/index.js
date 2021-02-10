import colors from 'kleur';
import { pathToFileURL } from 'url';
import { logger } from '../utils';
import Builder from './Builder';

export async function adapt(config, { verbose }) {
	if (!config.adapter) {
		throw new Error('No adapter specified');
	}

	const [adapter, options] = config.adapter;

	const log = logger({ verbose });

	console.log(colors.bold().cyan(`\n> Using ${adapter}`));

	const builder = new Builder({
		generated_files: '.svelte/build/optimized',
		config,
		log
	});

	const resolved = await import.meta.resolve(adapter, pathToFileURL(process.cwd()));
	const fn = await import(resolved);
	await fn(builder, options);

	log.success('done');
}
