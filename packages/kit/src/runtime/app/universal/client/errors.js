import { Redirect } from '@sveltejs/kit/internal';
import { _goto, handle_error } from '../../../client/client.js';

/**
 * Converts an error thrown by a universal function into an `App.Error`, running it through `handleError`.
 * Redirects trigger a navigation.
 * @param {unknown} error
 * @returns {Promise<App.Error>}
 */
export async function to_app_error(error) {
	if (error instanceof Redirect) {
		void _goto(error.location);
		return { status: error.status, message: `Redirected to ${error.location}` };
	}

	return handle_error(error, {
		params: {},
		route: { id: null },
		url: new URL(location.href)
	});
}
