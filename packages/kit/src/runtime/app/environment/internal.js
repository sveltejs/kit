export const BROWSER =
	typeof __SVELTEKIT_BROWSER__ === 'boolean'
		? __SVELTEKIT_BROWSER__
		: typeof window !== 'undefined';

// taken from https://github.com/benmccann/esm-env/blob/main/packages/esm-env/dev-fallback.js
// eslint-disable-next-line n/prefer-global/process
const node_env = globalThis.process?.env?.NODE_ENV;

export const DEV =
	typeof __SVELTEKIT_DEV__ === 'boolean'
		? __SVELTEKIT_DEV__
		: node_env && !node_env.toLowerCase().startsWith('prod');
