import { version } from '$app/env';

// Regression guard for #15971: this import runs before the router is initialized.
// Without the fix it throws `__SVELTEKIT_APP_VERSION__ is not defined` when
// `experimental.explicitEnvironmentVariables` is enabled. `void` keeps the import.
void version;
