// importing $env in the server hook can cause a cyclical import that crashes the app start up
// see https://github.com/sveltejs/kit/issues/16092
import { env } from '$env/dynamic/private';

/** @type {import('@sveltejs/kit').Handle} */
export function handle({ event, resolve }) {
	console.log({ FOO: env.MY_CUSTOM_FOO });
	return resolve(event);
}
