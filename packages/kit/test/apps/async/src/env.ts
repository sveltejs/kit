import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	PRIVATE_STATIC: {
		public: false,
		availability: 'inline'
	},
	PRIVATE_DYNAMIC: {
		public: false,
		availability: 'dynamic'
	},
	PUBLIC_STATIC: {
		public: true,
		availability: 'inline'
	},
	PUBLIC_DYNAMIC: {
		public: true,
		availability: 'dynamic'
	}
});
