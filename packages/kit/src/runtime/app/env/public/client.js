export * from '__sveltekit/env/browser';

if (!__SVELTEKIT_EXPERIMENTAL_EXPLICIT_ENVIRONMENT_VARIABLES__) {
	throw new Error('Cannot import `$app/env/public` unless `experimental.explicitEnvironmentVariables` is enabled')
}
