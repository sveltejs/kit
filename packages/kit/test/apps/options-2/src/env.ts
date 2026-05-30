import * as v from 'valibot';

export const variables = {
	PUBLIC_LOOK_IN_OPTIONS_2: {
		public: true,
		description: 'Public env var loaded from the shared test env directory'
	},
	PRIVATE_EXPLICIT_ENV: {},
	PRIVATE_STATIC_EXPLICIT_ENV: {
		static: true
	},
	PRIVATE_VALIDATED_DEFAULT_ENV: {
		validate: v.optional(v.picklist(['foo', 'bar']), 'foo')
	}
};
