import path from 'node:path';
import { GENERATED_COMMENT } from '../../constants.js';
import { write_if_changed } from './utils.js';

// TODO get rid of this, it's useless

/**
 * Writes ambient declarations including types reference to @sveltejs/kit,
 * and the existing environment variables in process.env to
 * $env/static/private and $env/static/public
 * @param {import('types').ValidatedKitConfig} config
 */
export function write_ambient(config) {
	/** @type {string} */
	const content = `${GENERATED_COMMENT}\n/// <reference types="@sveltejs/kit" />`;

	write_if_changed(path.join(config.outDir, 'ambient.d.ts'), content);
}
