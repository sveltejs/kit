import { dirname, resolve } from 'path';
import colors from 'kleur';
import { copy } from '@sveltejs/app-utils/files';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @param {string} dest */
export function copy_assets(dest) {
	let prefix = '..';
	do {
		// we jump through these hoops so that this function
		// works whether or not it's been bundled
		const resolved = resolve(__dirname, `${prefix}/assets`);

		if (existsSync(resolved)) {
			copy(resolved, dest);
			return;
		}

		prefix = `../${prefix}`;
	} while (true); // eslint-disable-line
}

function noop() {}

/** @param {{ verbose: boolean }} opts */
export function logger({ verbose }) {
	/** @type {import('../../types.internal').Logger} */
	const log = (msg) => console.log(msg.replace(/^/gm, '  '));

	log.success = (msg) => log(colors.green(`✔ ${msg}`));
	log.error = (msg) => log(colors.bold().red(msg));
	log.warn = (msg) => log(colors.bold().yellow(msg));

	log.minor = verbose ? (msg) => log(colors.grey(msg)) : noop;
	log.info = verbose ? log : noop;

	return log;
}
