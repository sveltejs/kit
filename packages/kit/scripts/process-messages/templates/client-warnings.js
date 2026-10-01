/** @import { ClientWarningOptions } from './internal/shared.js' */
import { DEV } from 'esm-env';
import { bold, normal } from './internal/shared.js';

/**
 * DESCRIPTION
 * @param {VALUES} _values
 * @param {ClientWarningOptions} [options]
 */
export function CODE(_values, options) {
	const details = options?.element ? [options.element] : [];

	if (DEV) {
		console.warn(
			`%c[sveltekit] ${'CODE'}\n%c${MESSAGE(_values)}\nhttps://svelte.dev/e/kit/${'CODE'}`,
			bold,
			normal,
			...details
		);
	} else {
		console.warn('https://svelte.dev/e/kit/CODE', ...details);
	}
}
