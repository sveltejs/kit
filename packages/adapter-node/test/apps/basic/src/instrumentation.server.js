import { INSTRUMENTATION_ENV } from '$app/env/private';

// @ts-expect-error test-only state shared with the endpoint
globalThis.instrumentation_env = INSTRUMENTATION_ENV;
