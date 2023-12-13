import { BROWSER, DEV } from 'esm-env';
export { building, version } from '__sveltekit/environment';

/**
 * `true` if the app is running in the browser.
 */
export const browser = BROWSER;

/**
 * Whether the dev server is running. This is not guaranteed to correspond to `NODE_ENV` or `MODE`.
 */
export const dev = DEV;
