/** @import { ServerThrowOptions } from './internal/server.js' */
import { throw_error } from './internal/server.js';

/**
 * DESCRIPTION
 * @param {VALUES} _values
 * @param {ServerThrowOptions} [options]
 * @returns {never}
 */
export function CODE(_values, options) {
	throw_error('CODE', MESSAGE(_values), options, CODE);
}
