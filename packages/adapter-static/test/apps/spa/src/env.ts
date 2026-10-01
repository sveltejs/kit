import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_VALUE: {
		public: true,
		static: true
	}
});
