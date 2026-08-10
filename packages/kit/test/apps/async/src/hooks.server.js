import { isRedirect } from '@sveltejs/kit';
import { do_something } from './routes/remote/server-action/action.remote';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	// Assign each browser session a unique id so that the in-memory `count`
	// state in `routes/remote/query-command.remote.js` is isolated per test.
	// Without this, tests running in parallel (different Playwright workers)
	// against the same server clobber each other's state and flake.
	if (!event.cookies.get('session')) {
		event.cookies.set('session', crypto.randomUUID(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax'
		});
	}

	if (event.isRemoteRequest && event.cookies.get('deny-remote') === '1') {
		return new Response(JSON.stringify({ message: 'denied by hook' }), {
			status: 403,
			headers: { 'content-type': 'application/json' }
		});
	}

	if (event.url.pathname === '/remote/hook-command') {
		try {
			const result = await do_something('from-hook');
			return new Response(JSON.stringify({ result }), {
				headers: { 'content-type': 'application/json' }
			});
		} catch (e) {
			return new Response(JSON.stringify({ error: /** @type {Error} */ (e).message }), {
				status: 500,
				headers: { 'content-type': 'application/json' }
			});
		}
	}
	return resolve(event);
}

/** @type {import('@sveltejs/kit').HandleValidationError} */
export const handleValidationError = ({ issues, event }) => {
	// must not throw, even when validation failed inside a query
	void event.url.pathname;
	return { message: issues[0].message };
};

/** @type {import('@sveltejs/kit').HandleServerError} */
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
