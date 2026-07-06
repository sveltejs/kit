import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	PUBLIC_STATIC: {
		public: true,
		availability: 'static'
	},
	PRIVATE_STATIC: {
		public: false,
		availability: 'static'
	}
});
