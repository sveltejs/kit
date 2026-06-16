/** @import { RemoteFunctionData, RemoteFunctionResponse, ServerHooks } from 'types' */

import { json } from '@sveltejs/kit';
import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';
import { stringify } from '../../shared.js';

/**
 * Maps a thrown value to an HTTP status code, defaulting to 500 for non-HTTP errors.
 * @param {unknown} error
 * @returns {number}
 */
export function error_to_status(error) {
	return error instanceof HttpError || error instanceof SvelteKitError ? error.status : 500;
}

/**
 * Builds the JSON success response for a (non-streaming) remote function call.
 * @param {RemoteFunctionData} data
 * @param {ServerHooks['transport']} transport
 * @returns {Response}
 */
export function result_response(data, transport) {
	return json(
		/** @type {RemoteFunctionResponse} */ ({
			type: 'result',
			data: stringify(data, transport)
		})
	);
}

/**
 * Builds the JSON error response for a remote function call.
 * @param {App.Error} error
 * @param {number} status
 * @param {ResponseInit} [init]
 * @returns {Response}
 */
export function error_response(error, status, init) {
	return json(
		/** @type {RemoteFunctionResponse} */ ({
			type: 'error',
			error,
			status
		}),
		init
	);
}
