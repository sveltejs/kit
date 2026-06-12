import { version } from '$app/env';

// Regression guard for #15971: this import runs before the router is initialized.
// Without the fix it throws `__SVELTEKIT_APP_VERSION__ is not defined` when
// `experimental.explicitEnvironmentVariables` is enabled. `void` keeps the import.
void version;

// Regression guard for #13249: top-level references to user `define`s must not
// evaluate before Vite's client has installed them as globals in dev
window.__test_user_define__ = __TEST_USER_DEFINE__;
