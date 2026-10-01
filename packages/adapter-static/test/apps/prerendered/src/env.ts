import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_ANSWER: {
		public: true,
		static: true
	}
});
