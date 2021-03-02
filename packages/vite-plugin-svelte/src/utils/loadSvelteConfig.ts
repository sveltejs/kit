import path from 'path';
import fs from 'fs';
import { log } from './log';

const knownSvelteConfigNames = ['svelte.config.js', 'svelte.config.cjs'];

export function loadSvelteConfig(root: string = process.cwd()) {
	const foundConfigs = knownSvelteConfigNames
		.map((candidate) => path.resolve(root, candidate))
		.filter((file) => fs.existsSync(file));
	if (foundConfigs.length === 0) {
		log.warn(`no svelte config found at ${root}`);
		return;
	} else if (foundConfigs.length > 1) {
		log.warn(
			`found more than one svelte config file, using ${foundConfigs[0]}. you should only have one!`,
			foundConfigs
		);
	}
	try {
		const config = require(foundConfigs[0]);
		return config;
	} catch (e) {
		log.error(`failed to load config ${foundConfigs[0]}`, e);
	}
}
