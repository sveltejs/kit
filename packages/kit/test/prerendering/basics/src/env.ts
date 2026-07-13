import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	PUBLIC_STATIC: {
		public: true,
		availability: 'inline'
	},
	PRIVATE_STATIC: {
		public: false,
		availability: 'inline'
	}
});
