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
export const handleError = ({ error: e, event, status, message }) => {
	// helps us catch sveltekit redirects thrown in component code
	if (isRedirect(e)) {
		throw new Error("Redirects shouldn't trigger the handleError hook");
	}

	const error = /** @type {Error} */ (e);

	return { message: `${error.message} (${status} ${message}, on ${event.url.pathname})` };
};

// TODO: remove in SvelteKit 3.0
// @ts-ignore this doesn't exist in old Node
Promise.withResolvers ??= () => {
	/** @type {{ promise: Promise<any>, resolve: (value: any) => void, reject: (reason?: any) => void }} */
	const d = {};
	d.promise = new Promise((resolve, reject) => {
		d.resolve = resolve;
		d.reject = reject;
	});
	return d;
};
