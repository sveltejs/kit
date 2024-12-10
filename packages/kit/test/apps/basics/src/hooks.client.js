import { env } from '$env/dynamic/public';
import { Foo } from './lib';

window.PUBLIC_DYNAMIC = env.PUBLIC_DYNAMIC;

/** @type{import("@sveltejs/kit").HandleClientError} */
export function handleError({ error, event, status, message }) {
	return event.url.pathname.endsWith('404-fallback')
		? undefined
		: { message: `${/** @type {Error} */ (error).message} (${status} ${message})` };
}

export const deserialize = {
	Foo() {
		return new Foo();
	}
};

export function init() {
	console.log('init hooks.client.js');
}
