import colors from 'kleur';
import { pathToFileURL } from 'url';
import { logger } from '../utils';
import Builder from './Builder';
import { createRequire } from 'module';

export async function adapt(config, { verbose }) {
	const [adapter, options] = config.adapter;

	if (!adapter) {
		throw new Error('No adapter specified');
	}

	const log = logger({ verbose });

	console.log(colors.bold().cyan(`\n> Using ${adapter}`));

	const builder = new Builder({
		generated_files: '.svelte/build/optimized',
		config,
		log
	});

	const require = createRequire(import.meta.url);
	const resolved = require.resolve(adapter, pathToFileURL(process.cwd()));
	const fn = (await import(resolved)).default;
	await fn(builder, options);

	log.success('done');
}
