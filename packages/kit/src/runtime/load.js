/**
 * @param {import('types/page').LoadOutput} loaded
 * @returns {import('types/internal').NormalizedLoadOutput}
 */
export function normalize(loaded) {
	// TODO should this behaviour be dev-only?
	const hasStatusError =
		loaded.status && loaded.status >= 400 && loaded.status <= 599 && !loaded.redirect;
	if (loaded.error || hasStatusError) {
		const status = loaded.status;

		if (!loaded.error && hasStatusError) {
			return {
				status,
				error: new Error('Internal Server Error')
			};
		}

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
