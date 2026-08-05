import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	MY_BASE_URL: { public: false, static: false }
});
