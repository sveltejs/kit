import { existsSync } from 'fs';
import colors from 'kleur';
import { resolve } from 'path';
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

	const manifest_file = resolve('.svelte/build/manifest.cjs');

	if (!existsSync(manifest_file)) {
		throw new Error('Could not find manifest file. Have you run `svelte-kit build`?');
	}

	const manifest = require(manifest_file);

	const builder = new Builder({
		generated_files: '.svelte/build/optimized',
		config,
		manifest,
		log
	});

	const fn = relative(adapter);
	await fn(builder, options);

	log.success('done');
}
