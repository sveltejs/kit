import { DEV } from 'esm-env';
import { bold, normal } from './internal/shared.js';

/**
 * DESCRIPTION
 * @param {VALUES} _values
 */
export function CODE(_values) {
	if (DEV) {
		console.warn(
			`%c[sveltekit] ${'CODE'}\n%c${MESSAGE(_values)}\nhttps://next.svelte.dev/e/@sveltejs/kit/${'CODE'}`,
			bold,
			normal
		);
	} else {
		console.warn('https://next.svelte.dev/e/@sveltejs/kit/CODE');
	}
}
