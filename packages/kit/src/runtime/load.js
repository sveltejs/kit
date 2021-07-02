/**
 * @param {import('types/page').LoadOutput} loaded
 * @returns {import('types/internal').NormalizedLoadOutput}
 */
export function normalize(loaded) {
	// TODO should this behaviour be dev-only?

	if (loaded.error) {
		//if (loaded.error || (loaded.status >= 400 && loaded.status <= 599)) {
		const status = loaded.status;
		// if (!loaded.error) {
		// 	let errorMessage = '';
		// 	switch (status) {
		// 		case 400:
		// 			errorMessage = 'Bad Request';
		// 			break;
		// 		case 401:
		// 			errorMessage = 'Unauthorized';
		// 			break;
		// 		case 403:
		// 			errorMessage = 'Forbidden';
		// 			break;
		// 		case 404:
		// 			errorMessage = 'Not Found';
		// 			break;
		// 		case 409:
		// 			errorMessage = 'Conflict';
		// 			break;
		// 		case 500:
		// 			errorMessage = 'Internal Server Error';
		// 			break;
		// 	}
		// 	return {
		// 		status,
		// 		error: new Error(errorMessage)
		// 	}
		// }
		const error = typeof loaded.error === 'string' ? new Error(loaded.error) : loaded.error;

		if (!(error instanceof Error)) {
			return {
				status: 500,
				error: new Error(
					`"error" property returned from load() must be a string or instance of Error, received type "${typeof error}"`
				)
			};
		}

		if (!status || status < 400 || status > 599) {
			console.warn('"error" returned from load() without a valid status code — defaulting to 500');
			return { status: 500, error };
		}

		return { status, error };
	}

	if (loaded.redirect) {
		if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
			return {
				status: 500,
				error: new Error(
					'"redirect" property returned from load() must be accompanied by a 3xx status code'
				)
			};
		}

		if (typeof loaded.redirect !== 'string') {
			return {
				status: 500,
				error: new Error('"redirect" property returned from load() must be a string')
			};
		}
	}

	return /** @type {import('types/internal').NormalizedLoadOutput} */ (loaded);
}
