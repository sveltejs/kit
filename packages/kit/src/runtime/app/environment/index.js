export * from '../env/index.js';

if (__SVELTEKIT_EXPERIMENTAL_EXPLICIT_ENVIRONMENT_VARIABLES__) {
	throw new Error(
		'Cannot import `$app/environment` when `experimental.explicitEnvironmentVariables` is enabled. Use `$app/env` instead.'
	);
}
