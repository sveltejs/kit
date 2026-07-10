import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	MY_BASE_URL: { public: false, static: false }
});
