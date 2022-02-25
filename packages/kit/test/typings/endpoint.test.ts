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

// valid - body instance of Uint8Array should be allowed
export const uint8array_body: RequestHandler = () => {
	return {
		body: new Uint8Array()
	};
};

// valid - body instance of ReadableStream should be allowed
export const readable_stream_body: RequestHandler = () => {
	return {
		body: new ReadableStream()
	};
};

// valid - body instance of stream.Readable should be allowed
export const stream_readable_body: RequestHandler = async () => {
	const { Readable } = await import('stream');
	return {
		body: new Readable()
	};
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

// --- invalid cases ---

// @ts-expect-error - should not have undefined (should it not?)
export const error_no_undefined: RequestHandler = () => {
	return {
		body: { no: Math.random() < 0.5 ? undefined : 'something' }
	};
};

// @ts-expect-error - body must be JSON serializable
export const error_body_must_be_serializable: RequestHandler = () => {
	return {
		body: () => {}
	};
};

// @ts-expect-error - body typed array must only be Uint8Array
export const error_other_typed_array_instances: RequestHandler = () => {
	return {
		body: new Uint16Array()
	};
};

// @ts-expect-error - instances cannot be nested
export const error_nested_instances: RequestHandler = () => {
	return {
		body: { typed: new Uint8Array() }
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
