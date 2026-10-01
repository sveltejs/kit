/** @import { ThrowOptions } from './internal/build.js' */
import { throw_error } from './internal/build.js';

/**
 * DESCRIPTION
 * @param {VALUES} _values
 * @param {ThrowOptions} [options]
 * @returns {never}
 */
export function CODE(_values, options) {
	throw_error('CODE', MESSAGE(_values), options, CODE);
}
