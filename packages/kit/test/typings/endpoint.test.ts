import { RequestHandler } from '@sveltejs/kit';

const valid_body = {
	str: 'string',
	num: 12345,
	bool: true,
	null: null,
	maybe: Math.random() < 0.5 ? undefined : true,
	custom: {
		toJSON: () => 'custom toJSON function'
	},
	list: ['string', 12345, false, null, undefined],
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

/**
 * NOTE about type casting in body returned
 *
 * tests below with `{} as Interface` casts are there only for
 * convenience purposes so we won't have to actually fill in the
 * required data, it serves the exact same purpose and doesn't
 * make the tests invalid
 */

/** example json-serializable POJO */
interface ExamplePost {
	title: string;
	description: string;
	published_date?: string;
	author_name?: string;
	author_link?: string;
}
// valid - should not be any different
export const generic_case: RequestHandler<Record<string, string>, ExamplePost> = () => {
	return {
		body: {} as ExamplePost
	};
};

interface NestedChild {
	message: string;
}
interface ParentWrapper {
	fields: NestedChild;
}
export const nested_interfaces: RequestHandler<Record<string, string>, ParentWrapper> = () => {
	return {
		body: {} as ParentWrapper
	};
};

// --- invalid cases ---

// @ts-expect-error - bigint cannot be converted to JSON string
export const error_unserializable_literal_bigint: RequestHandler = () => {
	return {
		body: BigInt('')
	};
};
// @ts-expect-error - bigint cannot be converted to JSON string
export const error_unserializable_property_bigint: RequestHandler = () => {
	return {
		body: {
			answer: BigInt('')
		}
	};
};
// @ts-expect-error - function cannot be converted to JSON string
export const error_unserializable_literal_function: RequestHandler = () => {
	return {
		body: () => {}
	};
};
// @ts-expect-error - function cannot be converted to JSON string
export const error_unserializable_property_function: RequestHandler = () => {
	return {
		body: {
			sorter() {}
		}
	};
};
// @ts-expect-error - symbol cannot be converted to JSON string
export const error_unserializable_literal_symbol: RequestHandler = () => {
	return {
		body: Symbol()
	};
};
// @ts-expect-error - symbol cannot be converted to JSON string
export const error_unserializable_property_symbol: RequestHandler = () => {
	return {
		body: {
			id: Symbol()
		}
	};
};

/** example object that isn't serializable */
interface InvalidPost {
	sorter(a: any, b: any): number;
}
// @ts-expect-error - body must be JSON serializable with Generic passed
export const error_unserializable_generic: RequestHandler<
	Record<string, string>,
	InvalidPost
> = () => {
	return {
		body: {} as InvalidPost
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
