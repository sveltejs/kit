import { isRedirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit/hooks').HandleClientError} */
export const handleError = (input) => {
	// helps us catch sveltekit redirects thrown in component code
	if (isRedirect(input.error)) {
		throw new Error("Redirects shouldn't trigger the handleError hook");
	}

	if (input.kind !== 'unknown') return input.error;

	const error = /** @type {Error} */ (input.error);

	return {
		message: `${error.message} (500 Internal Error, on ${input.event.url.pathname})`
	};
};
