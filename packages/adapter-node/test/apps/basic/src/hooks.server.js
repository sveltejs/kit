// importing $app/env/* in the server hook can cause a cyclical import that crashes the app start up
// see https://github.com/sveltejs/kit/issues/16092
import { MY_CUSTOM_PORT } from '$app/env/private';

/** @type {import('@sveltejs/kit').Handle} */
export function handle({ event, resolve }) {
	if (!MY_CUSTOM_PORT) throw new Error('MY_CUSTOM_PORT should be defined');
	return resolve(event);
}
