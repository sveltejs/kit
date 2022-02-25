import { RequestHandler } from '@sveltejs/kit';

const valid_body = {
	str: 'string',
	num: 12345,
	bool: true,
	null: null,
	custom: {
		toJSON: () => 'custom toJSON function'
	},
	list: ['string', 12345, false, null],
	nested: {
		another: 'string',
		big_num: 98765,
		binary: false,
		nullish: null,
		custom: {
			toJSON: () => 'hi mom'
		},
		list: [],
		deeply: {
			nested: {}
		}
	}
};

// valid - basic case of returning an object
export const base_case: RequestHandler = () => {
	return {
		body: valid_body
	};
};

// valid - raw Response instance should be allowed
export const response_instance: RequestHandler = () => {
	return new Response();
};

// valid - different header pairs should be allowed
export const differential_headers_assignment: RequestHandler = () => {
	if (Math.random() < 0.5) {
		return { headers: { foo: 'bar' } };
	} else {
		return { headers: { baz: 'foo' } };
	}
};

// TODO https://github.com/sveltejs/kit/issues/1997
// interface ExamplePost {
// 	title: string;
// 	description: string;
// 	published_date?: string;
// 	author_name?: string;
// 	author_link?: string;
// }
// // valid - should not be any different
// export const generic_case: RequestHandler<Record<string, string>, ExamplePost> = () => {
// 	return {
// 		body: {} as ExamplePost
// 	};
// };

// @ts-expect-error - should not have undefined (should it not?)
export const error_no_undefined: RequestHandler = () => {
	return {
		body: { no: undefined }
	};
};

// @ts-expect-error - body must be JSON serializable
export const error_body_must_be_serializable: RequestHandler = () => {
	return {
		body: () => {}
	};
};

// @ts-expect-error - fallthrough must be isolated
export const error_fallthrough_not_isolated: RequestHandler = () => {
	return {
		body: {},
		fallthrough: true
	};
};

// @ts-expect-error - fallthrough must be of value `true`
export const error_fallthrough_not_true: RequestHandler = () => {
	return {
		fallthrough: null
	};
};
