import { BROWSER, DEV } from 'esm-env';

/**
 * `true` if the app is running in the browser.
 */
export const browser = BROWSER;

/**
 * Whether the dev server is running. This is not guaranteed to correspond to `NODE_ENV` or `MODE`.
 */
export const dev = DEV;

export { building, version } from '__sveltekit/environment';

// TODO this will need to be declared ambiently somewhere
// /**
//  * SvelteKit analyses your app during the `build` step by running it. During this process, `building` is `true`. This also applies during prerendering.
//  */
// export const building: boolean;

// /**
//  * The value of `config.kit.version.name`.
//  */
// export const version: string;
