import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	INSTRUMENTATION_ENV: { schema: (value) => value }
});
