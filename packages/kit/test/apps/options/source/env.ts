import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	GO_AWAY_PLEASE: {
		public: true
	},
	TOP_SECRET_SHH_PLS: {
		static: true
	}
});
