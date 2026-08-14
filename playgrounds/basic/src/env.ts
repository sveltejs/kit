import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	MESSAGE: {
		public: true
	},
	SECRET: {},
	STATIC: {
		static: true
	}
});
