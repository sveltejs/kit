/**
 * A fake asset path used in `vite dev` and `vite preview`, so that we can
 * serve local assets while verifying that requests are correctly prefixed
 */
export const SVELTE_KIT_ASSETS = '/_svelte_kit_assets';

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

/**
 * The module that a dev server outside the Vite process imports to report the error in its
 * query, since only the Vite process can log it and show the error overlay
 */
export const DEV_REPORT_ERROR_ID = '/@sveltejs/kit/dev/report-error';

// eslint-disable-next-line n/prefer-global/process
export const IN_WEBCONTAINER = !!globalThis.process?.versions?.webcontainer;

/**
 * If an an adapter deploys a catch-all serverless function, the rerouted URL
 * is stored in this header.
 */
export const REROUTED_URL_HEADER = 'x-sveltekit-rerouted-url';
