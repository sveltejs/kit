import { dev } from '../env/index.js';
export * from '../env/index.js';

if (dev && __SVELTEKIT_EXPERIMENTAL_EXPLICIT_ENVIRONMENT_VARIABLES__) {
	console.warn(
		'Use `$app/env` instead of `$app/environment` when `experimental.explicitEnvironmentVariables` is enabled'
	);
}
