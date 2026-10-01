import { BROWSER, DEV } from 'esm-env';
import { throw_error, verbose } from './internal/shared.js';

/**
 * DESCRIPTION
 * @param {VALUES} _values
 * @returns {never}
 */
export function CODE(_values) {
	if (DEV || (!BROWSER && verbose)) {
		throw_error('CODE', MESSAGE(_values), CODE);
	}

	throw new Error('https://next.svelte.dev/e/kit/CODE');
}
