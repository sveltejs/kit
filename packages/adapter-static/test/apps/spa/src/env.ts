import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	PUBLIC_VALUE: {
		public: true,
		static: true
	}
});
