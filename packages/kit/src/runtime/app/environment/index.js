export { BROWSER as browser, DEV as dev } from 'esm-env';
export { building, version } from '__sveltekit/environment';

if (__SVELTEKIT_EXPERIMENTAL_EXPLICIT_ENVIRONMENT_VARIABLES__) {
	throw new Error('Cannot import `$app/environment` when `experimental.explicitEnvironmentVariables` is enabled. Use `$app/env` instead.');
}
