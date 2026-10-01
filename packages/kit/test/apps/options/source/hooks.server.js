import { building } from '$app/environment';
import { env } from '$env/dynamic/private';

// this verifies that dynamic env vars can be read during analysis phase
// (it would fail if this app contained prerendered routes)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FOO = env.FOO;

/** @type {import('@sveltejs/kit').Handle} */
export function handle({ event, resolve }) {
	return resolve(event, {
		// this allows us to check that <link rel="stylesheet"> is still added
		// to the DOM even if they're not included by `preload`
		preload: ({ type }) => type !== 'css'
	});
}

export function init() {
	if (building) {
		throw new Error(
			'There are no prerendered pages or functions in this app so init() should not be called during the build'
		);
	}
}
