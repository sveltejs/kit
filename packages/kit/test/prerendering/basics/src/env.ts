import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	PUBLIC_STATIC: {
		public: true,
		static: true
	},
	PRIVATE_STATIC: {
		public: false,
		static: true
	}
});
