import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	SHOULD_EXPLODE: {}
});
