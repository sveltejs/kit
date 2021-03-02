import { dirname, resolve } from 'path';
import colors from 'kleur';
import { copy } from '@sveltejs/app-utils/files';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function copy_assets(dest) {
	copy(resolve(__dirname, '../assets'), dest);
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
