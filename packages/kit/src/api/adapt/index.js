import colors from 'kleur';
import { pathToFileURL } from 'url';
import { logger } from '../utils.js';
import Builder from './Builder.js';
import { createRequire } from 'module';

/**
 * @param {import('../../types').ValidatedConfig} config
 * @param {{ cwd?: string, verbose: boolean }} opts
 */
export async function adapt(config, { cwd = process.cwd(), verbose }) {
	if (!config.kit.adapter) {
		throw new Error('No adapter specified');
	}

	const [adapter, options] = config.kit.adapter;

	const log = logger({ verbose });

	console.log(colors.bold().cyan(`\n> Using ${adapter}`));

	const builder = new Builder({ cwd, config, log });

	const require = createRequire(import.meta.url);
	const resolved = require.resolve(adapter, { paths: [pathToFileURL(process.cwd()).href] });
	const fn = (await import(pathToFileURL(resolved).href)).default;
	await fn(builder, options);

	log.success('done');
}
