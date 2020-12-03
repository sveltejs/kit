import { resolve } from 'path';
import colors from 'kleur';
import { copy } from '@sveltejs/app-utils/files';

export function copy_assets() {
	copy(resolve(__dirname, '../assets'), '.svelte/assets');
}

export function logger() {
	const log = (msg) => console.log(msg.replace(/^/gm, '  '));
	log.success = (msg) => log(colors.green(`✔ ${msg}`));
	log.error = (msg) => log(colors.bold().red(msg));
	log.warn = (msg) => log(colors.bold().yellow(msg));
	log.minor = (msg) => log(colors.grey(msg));
	log.info = log;

	return log;
}
