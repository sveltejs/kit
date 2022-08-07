import { HttpError, Redirect } from './private.js';

/**
 * @param {number} status
 * @param {string} message
 */
export function error(status, message) {
	return new HttpError(status, message);
}

/**
 * @param {number} status
 * @param {string} location
 */
export function redirect(status, location) {
	if (isNaN(status) || status < 300 || status > 399) {
		throw new Error('Invalid status code');
	}

	return new Redirect(status, location);
}
