import { env } from 'cloudflare:workers';

// @ts-expect-error test-only state shared with the endpoint
globalThis.instrumentation_env = env.FOO;
