import fs from 'fs';
import path from 'path';
import { copy } from '../../utils/filesystem.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @param {string} dest */
export function copy_assets(dest) {
	if (!process.env.BUNDLED) return;
	let prefix = '..';
	do {
		// we jump through these hoops so that this function
		// works whether or not it's been bundled
		const resolved = path.resolve(__dirname, `${prefix}/assets`);

		if (fs.existsSync(resolved)) {
			copy(resolved, dest);
			return;
		}

		prefix = `../${prefix}`;
	} while (true); // eslint-disable-line
}
