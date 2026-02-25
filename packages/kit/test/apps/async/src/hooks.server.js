import { isRedirect } from '@sveltejs/kit';
import { do_something } from './routes/remote/server-action/action.remote';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
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
export const handleValidationError = ({ issues }) => {
	return { message: issues[0].message };
};

/** @type {import('@sveltejs/kit').HandleServerError} */
export const handleError = ({ error: e, status, message }) => {
	// helps us catch sveltekit redirects thrown in component code
	if (isRedirect(e)) {
		throw new Error("Redirects shouldn't trigger the handleError hook");
	}

	const error = /** @type {Error} */ (e);

	return { message: `${error.message} (${status} ${message})` };
};

// @ts-ignore this doesn't exist in old Node TODO remove SvelteKit 3 (same in test-basics)
Promise.withResolvers ??= () => {
	const d = {};
	d.promise = new Promise((resolve, reject) => {
		d.resolve = resolve;
		d.reject = reject;
	});
	return d;
};
