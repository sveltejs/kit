import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @param {string} dir */
export function mkdirp(dir) {
	try {
		fs.mkdirSync(dir, { recursive: true });
	} catch (e) {
		if (/** @type {any} */ (e).code === 'EEXIST') return;
		throw e;
	}
}

/** @param {string} path */
export function rimraf(path) {
	(fs.rmSync || fs.rmdirSync)(path, { recursive: true, force: true });
}

/**
 * @template T
 * @param {T} x
 */
function identity(x) {
	return x;
}

/**
 * @param {string} from
 * @param {string} to
 * @param {(basename: string) => string} rename
 */
export function copy(from, to, rename = identity) {
	if (!fs.existsSync(from)) return;

	const stats = fs.statSync(from);

	if (stats.isDirectory()) {
		fs.readdirSync(from).forEach((file) => {
			copy(path.join(from, file), path.join(to, rename(file)));
		});
	} else {
		mkdirp(path.dirname(to));
		fs.copyFileSync(from, to);
	}
}

/** @param {string} path */
export function dist(path) {
	return fileURLToPath(new URL(`./dist/${path}`, import.meta.url).href);
}

// Thanks to https://github.com/zkochan/packages/tree/main/which-pm-runs for this code!
export function get_package_manager() {
	if (!process.env.npm_config_user_agent) {
		return undefined;
	}
	return pm_from_user_agent(process.env.npm_config_user_agent);
}

/** @param {string} userAgent */
function pmFromUserAgent(userAgent) {
	const pmSpec = userAgent.split(' ')[0];
	const separatorPos = pmSpec.lastIndexOf('/');
	const name = pmSpec.substring(0, separatorPos);
	return {
		name: name === 'npminstall' ? 'cnpm' : name,
		version: pmSpec.substring(separatorPos + 1)
	};
}
