export * from '../env/index.js';

if (__SVELTEKIT_EXPERIMENTAL_EXPLICIT_ENVIRONMENT_VARIABLES__) {
	throw new Error(
		'Cannot import `$app/environment` when `experimental.explicitEnvironmentVariables` is enabled. Use `$app/env` instead.'
	);
}

// force the Vite client to load, so that defines are definitely defined
import.meta.hot;
