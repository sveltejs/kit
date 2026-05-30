import * as v from 'valibot';

const public_options = {
	public: true,
	description: 'Public env var loaded from the shared test env directory'
};

const private_static_options = {
	static: true
};

export const variables = {
	PUBLIC_LOOK_IN_OPTIONS_2: public_options,
	PRIVATE_EXPLICIT_ENV: {},
	...(process.env.TEST_DYNAMIC_ENV_SPREAD !== 'false' && {
		PRIVATE_STATIC_EXPLICIT_ENV: private_static_options
	}),
	PRIVATE_VALIDATED_DEFAULT_ENV: {
		validate: v.optional(v.picklist(['foo', 'bar']), 'foo')
	}
};
