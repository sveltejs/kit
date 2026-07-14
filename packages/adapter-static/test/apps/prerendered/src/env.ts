import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	PUBLIC_ANSWER: {
		public: true,
		static: true
	}
});
