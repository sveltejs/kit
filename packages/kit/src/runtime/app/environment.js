import { BROWSER, DEV } from 'esm-env';
import { building as _building, version as _version } from '__sveltekit/environment';

/**
 * SvelteKit analyses your app during the `build` step by running it. During this process, `building` is `true`. This also applies during prerendering.
 */
export const building = _building;

/**
 * The value of `config.kit.version.name`.
 */
export const version = _version;

/**
 * `true` if the app is running in the browser.
 */
export const browser = BROWSER;

/**
 * Whether the dev server is running. This is not guaranteed to correspond to `NODE_ENV` or `MODE`.
 */
export const dev = DEV;
