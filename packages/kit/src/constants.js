/**
 * A fake asset path used in `vite dev` and `vite preview`, so that we can
 * serve local assets while verifying that requests are correctly prefixed
 */
export const SVELTE_KIT_ASSETS = '/_svelte_kit_assets';

/** dev server path that returns the css a module depends on */
export const DEV_INLINE_STYLES_PATH = '/@sveltejs/kit/dev/inline-styles';

/** dev server path that returns the sizes of the assets a module imports */
export const DEV_SERVER_ASSETS_PATH = '/@sveltejs/kit/dev/server-assets';

/**
 * response header that reports the features and remote function a request used
 */
export const DEV_INFO_HEADER = 'x-sveltekit-dev-info';

/**
 * request header that asks the dev server for the exports of a remote module
 */
export const DEV_REMOTE_EXPORTS_HEADER = 'x-sveltekit-dev-remote-exports';

export const DEV_SERVER_ID = 'virtual:sveltekit/server';

/** exports the origin of the vite dev server */
export const DEV_HOST_ID = '__sveltekit/dev/host';

/** id prefix of the modules that load a remote module by its hash */
export const DEV_REMOTE_PREFIX = '__sveltekit/dev/remote/';

export const GENERATED_COMMENT = '// this file is generated — do not edit it';

export const ENDPOINT_METHODS = [
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
	'OPTIONS',
	'HEAD',
	'QUERY'
];

export const MUTATIVE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/** methods whose responses depend on the request body, so they can never be prerendered */
export const BODY_DEPENDENT_METHODS = [...MUTATIVE_METHODS, 'QUERY'];

export const PAGE_METHODS = ['GET', 'POST', 'HEAD'];

export const SRC_ROOT = import.meta.dirname;

// eslint-disable-next-line n/prefer-global/process
export const IN_WEBCONTAINER = !!globalThis.process?.versions?.webcontainer;

/**
 * If an an adapter deploys a catch-all serverless function, the rerouted URL
 * is stored in this header.
 */
export const REROUTED_URL_HEADER = 'x-sveltekit-rerouted-url';
