import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	PRIVATE_STATIC: {
		public: false,
		availability: 'static'
	},
	PRIVATE_DYNAMIC: {
		public: false,
		availability: 'dynamic'
	},
	PUBLIC_STATIC: {
		public: true,
		availability: 'static'
	},
	PUBLIC_DYNAMIC: {
		public: true,
		availability: 'dynamic'
	}
});
