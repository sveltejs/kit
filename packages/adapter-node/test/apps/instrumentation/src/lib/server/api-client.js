import { MY_BASE_URL } from '$app/env/private';

// Module-scope read — mirrors configuring an API client with `baseUrl` from dynamic
// env. Correct only if env is populated before this module evaluates.
export const CAPTURED_AT_MODULE_SCOPE = MY_BASE_URL;
