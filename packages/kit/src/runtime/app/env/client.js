import { payload } from '../../client/payload.js';

/**
 * `true` if the app is running in the browser.
 * @type {boolean}
 */
export const browser = true;

/**
 * Whether the dev server is running. This is not guaranteed to correspond to `NODE_ENV` or `MODE`.
 * @type {boolean}
 */
export const dev = __SVELTEKIT_DEV__;

/**
 * SvelteKit analyses your app during the `build` step by running it. During this process, `building` is `true`. This also applies during prerendering.
 * @type {boolean}
 */
export const building = false;

/**
 * The value of `config.version.name`.
 */
export const version = payload.version;
