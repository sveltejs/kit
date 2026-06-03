import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	PRIVATE_STATIC: {
		public: false,
		static: true
	},
	PRIVATE_DYNAMIC: {
		public: false,
		static: false
	},
	PUBLIC_STATIC: {
		public: true,
		static: true
	},
	PUBLIC_DYNAMIC: {
		public: true,
		static: false
	},
	PUBLIC_THEME: {
		public: true,
		static: false
	},
	PUBLIC_PRERENDERING: {
		public: true,
		static: false
	},
	SOME_JSON: {
		public: false,
		static: true
	}
});
