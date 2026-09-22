import { INSTRUMENTATION_ENV } from '$app/env/private';

globalThis.__INSTRUMENTATION_ENV_LOADED__ = INSTRUMENTATION_ENV === 'platform';
