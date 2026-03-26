// taken from https://github.com/benmccann/esm-env/blob/main/packages/esm-env/dev-fallback.js
export const BROWSER =
	typeof __SVELTEKIT_BROWSER__ === 'boolean'
		? __SVELTEKIT_BROWSER__
		: typeof window !== 'undefined';

export const DEV =
	typeof __SVELTEKIT_DEV__ === 'boolean'
		? __SVELTEKIT_DEV__
		: // inlining the globalThis.process access instead of declaring a variable for it helps
			// Rolldown treeshake it if it's unused
			// eslint-disable-next-line n/prefer-global/process
			globalThis.process?.env?.NODE_ENV &&
			// eslint-disable-next-line n/prefer-global/process
			!globalThis.process?.env?.NODE_ENV.toLowerCase().startsWith('prod');

export const version =
	typeof __SVELTEKIT_APP_VERSION__ === 'string' ? __SVELTEKIT_APP_VERSION__ : 'unknown';
export let building = false;
export let prerendering = false;

export function set_building() {
	building = true;
}

export function set_prerendering() {
	prerendering = true;
}
