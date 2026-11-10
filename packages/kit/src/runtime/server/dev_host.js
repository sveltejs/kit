// lets a dev server in another vite environment ask the vite dev server for what only it knows
import { DEV_INLINE_STYLES_PATH } from '../../constants.js';

/**
 * fetches json from the vite dev server, or undefined when it does not have it
 * @param {string} pathname
 * @param {Record<string, string | string[]>} params
 * @returns {Promise<any>}
 */
async function ask(pathname, params) {
	// written by the vite dev server once it listens
	const { origin } = await import('<sveltekit:generated>/origin.js');

	const url = new URL(pathname, origin);
	for (const [key, value] of Object.entries(params)) {
		for (const item of Array.isArray(value) ? value : [value]) url.searchParams.append(key, item);
	}

	const response = await fetch(url);
	return response.ok ? response.json() : undefined;
}

/**
 * asks the vite dev server for the css that modules depend on, since only it has the module graph
 * @param {string[]} modules
 * @returns {Promise<Record<string, string>>}
 */
export async function inline_styles(modules) {
	/** @type {Record<string, string>} */
	const styles = {};
	if (modules.length === 0) return styles;

	/** @type {Array<{ url: string; inline: string }> | undefined} */
	const dependencies = await ask(DEV_INLINE_STYLES_PATH, { module: modules });

	for (const dependency of dependencies ?? []) {
		try {
			const module = await import(/* @vite-ignore */ dependency.inline);
			styles[dependency.url] = module.default;
		} catch {
			// this can happen with dynamically imported modules, like in the node dev server
		}
	}

	return styles;
}
