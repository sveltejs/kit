import { isRedirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').HandleClientError} */
export const handleError = ({ error: e, event, status, message }) => {
	// helps us catch sveltekit redirects thrown in component code
	if (isRedirect(e)) {
		throw new Error("Redirects shouldn't trigger the handleError hook");
	}

	const error = /** @type {Error} */ (e);

	return { message: `${error.message} (${status} ${message}, on ${event.url.pathname})` };
};
