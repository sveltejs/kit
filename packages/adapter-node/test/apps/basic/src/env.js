import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	MY_CUSTOM_PORT: {}
});
