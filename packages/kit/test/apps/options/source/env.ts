import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	GO_AWAY_PLEASE: {
		public: true
	},
	TOP_SECRET_SHH_PLS: {
		static: true
	}
});
