import { resolve } from 'path';
import colors from 'kleur';
import { copy } from '@sveltejs/app-utils/files';

export function copy_assets() {
	copy(resolve(__dirname, '../assets'), '.svelte/assets');
}

function noop() {}

export function logger({ verbose }) {
	const log = (msg) => console.log(msg.replace(/^/gm, '  '));

	log.success = (msg) => log(colors.green(`✔ ${msg}`));
	log.error = (msg) => log(colors.bold().red(msg));
	log.warn = (msg) => log(colors.bold().yellow(msg));

	log.minor = verbose ? (msg) => log(colors.grey(msg)) : noop;
	log.info = verbose ? log : noop;

	return log;
}
