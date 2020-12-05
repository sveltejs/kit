import { existsSync } from 'fs';
import { bold, cyan, green } from 'kleur/colors';
import { resolve } from 'path';
import relative from 'require-relative';
import { log } from '../../logging';
import Builder from './Builder';

export async function adapt(config) {
	if (!config.adapter) {
		throw new Error('No adapter specified');
	}

	if (typeof config.adapter !== 'string') {
		// TODO
		throw new Error('Adapter must be a string');
	}

	console.log(bold(cyan(`\n> Using ${config.adapter}`)));

	const manifest_file = resolve('.svelte/build/manifest.cjs');

	if (!existsSync(manifest_file)) {
		throw new Error('Could not find manifest file. Have you run `svelte-kit build`?');
	}

	const manifest = require(manifest_file);

	const builder = new Builder({
		generated_files: '.svelte/build/optimized',
		static_files: config.paths.static,
		manifest,
		log
	});

	const adapter = relative(config.adapter);
	await adapter(builder);

	log.info(`${bold(green('✔'))} done`);
}
