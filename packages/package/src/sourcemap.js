import path from 'node:path';
import { posixify } from './filesystem.js';

/**
 * @typedef {{sources: string[]}} SourceMap
 */
/**
 * Resolve sourcemap
 * @param {string} from
 * @param {string} to
 * @param {string} content
 * @returns {string}
 */
export function resolve_sourcemap(from, to, content) {
	/** @type {SourceMap} */
	const parsed = JSON.parse(content);
	if (parsed.sources) {
		parsed.sources = parsed.sources.map((source) => {
			const base = path.dirname(from);
			const abs = path.resolve(base, source);
			const relative = posixify(path.relative(path.dirname(to), abs));
			return relative;
		});
	}
	return JSON.stringify(parsed);
}

/**
 * Check if sourcemaps should be generated
 * @param {import('./types.js').Options["config"]} config
 * @returns {boolean}
 */
export function should_generate_sourcemap(config) {
	const option = config.compilerOptions?.enableSourcemap;
	if (option === true || option === false) return option;
	if (option) {
		return option.js !== false;
	}
	return true;
}
