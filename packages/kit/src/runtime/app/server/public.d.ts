import { StandardSchemaV1 } from '@standard-schema/spec';
import { DeepPartial, IsAny, MaybePromise } from 'types';
import { RouteId as AppRouteId, LayoutParams as AppLayoutParams } from '$app/types';

export * from './index.js';

// @ts-ignore this is an optional peer dependency so could be missing. Written like this so dts-buddy preserves the ts-ignore
type Span = import('@opentelemetry/api').Span;

export interface Cookies {
	/**
	 * Gets a cookie that was previously set with `cookies.set`, or from the request headers.
	 * @param name the name of the cookie
	 * @param opts the options, passed directly to `cookie.parseCookie`. See documentation [here](https://github.com/jshttp/cookie?tab=readme-ov-file#cookieparsecookiestr-options)
	 */
	get: (name: string, opts?: import('cookie').ParseOptions) => string | undefined;

	/**
	 * Gets all cookies that were previously set with `cookies.set`, or from the request headers.
	 * @param opts the options, passed directly to `cookie.parseCookie`. See documentation [here](https://github.com/jshttp/cookie?tab=readme-ov-file#cookieparsecookiestr-options)
	 */
	getAll: (opts?: import('cookie').ParseOptions) => Array<{ name: string; value: string }>;

	/**
	 * Sets a cookie. This will add a `set-cookie` header to the response, but also make the cookie available via `cookies.get` or `cookies.getAll` during the current request.
	 *
	 * The `httpOnly` is `true` by default, as is `secure`, except during development, when it defaults to `false`. These must be explicitly disabled if you want cookies to be readable by client-side JavaScript and/or transmitted over HTTP.
	 *
	 * The `path` option is `'/'` by default. You can use relative paths, or set `path: ''` to make the cookie only available on the current path and its children.
	 * @param name the name of the cookie
	 * @param value the cookie value
	 * @param opts the options passed to `cookie.stringifySetCookie` with the SvelteKit defaults described above. See documentation [here](https://github.com/jshttp/cookie?tab=readme-ov-file#cookiestringifysetcookiesetcookieobj-options)
	 */
	set: (name: string, value: string, opts: import('cookie').SerializeOptions) => void;

	/**
	 * Deletes a cookie by setting its value to an empty string and setting the expiry date in the past.
	 *
	 * The `httpOnly` is `true` by default, as is `secure`, except during development, when it defaults to `false`. These must be explicitly disabled if you want cookies to be readable by client-side JavaScript and/or transmitted over HTTP.
	 *
	 * The `path` option is `'/'` by default. You can use relative paths, or set `path: ''` to make the cookie only available on the current path and its children.
	 * @param name the name of the cookie
	 * @param opts the options passed to `cookie.stringifySetCookie` with the SvelteKit defaults described above. See documentation [here](https://github.com/jshttp/cookie?tab=readme-ov-file#cookiestringifysetcookiesetcookieobj-options)
	 */
	delete: (name: string, opts: import('cookie').SerializeOptions) => void;

	/**
	 * Parses a single `Set-Cookie` header. This allows you to apply cookies received from an external source:
	 *
	 * ```js
	 * import { getRequestEvent } from '$app/server';
	 *
	 * export async function GET() {
	 * 	const { cookies } = getRequestEvent();
	 *
	 * 	const response = await fetch('...');
	 *
	 * 	for (const str of response.headers.getSetCookie()) {
	 * 		const { name, value, ...options } = cookies.parse(str);
	 * 		cookies.set(name, value, { ...options, path: '/' });
	 * 	}
	 *
	 * 	// ...
	 * }
	 * ```
	 *
	 * Note the use of `headers.getSetCookie()`, which returns an array of cookie headers, _not_ `headers.get('set-cookie')` which returns a single comma-separated string.
	 */
	parse: typeof import('cookie').parseSetCookie;

	/**
	 * Serialize a cookie name-value pair into a `Set-Cookie` header string, but don't apply it to the response.
	 *
	 * The `httpOnly` is `true` by default, as is `secure`, except during development, when it defaults to `false`. These must be explicitly disabled if you want cookies to be readable by client-side JavaScript and/or transmitted over HTTP.
	 *
	 * The `path` option is `'/'` by default. You can use relative paths, or set `path: ''` to make the cookie only available on the current path and its children.
	 * @param name the name of the cookie
	 * @param value the cookie value
	 * @param opts the options passed to `cookie.stringifySetCookie` with the SvelteKit defaults described above. See documentation [here](https://github.com/jshttp/cookie?tab=readme-ov-file#cookiestringifysetcookiesetcookieobj-options)
	 */
	serialize: (name: string, value: string, opts: import('cookie').SerializeOptions) => string;
}

export interface RequestEvent<
	Params extends AppLayoutParams<'/'> = AppLayoutParams<'/'>,
	RouteId extends AppRouteId | null = AppRouteId | null
> {
	/**
	 * Get or set cookies related to the current request
	 */
	readonly cookies: Cookies;
	/**
	 * `fetch` is equivalent to the [native `fetch` web API](https://developer.mozilla.org/en-US/docs/Web/API/fetch), with a few additional features:
	 *
	 * - It can be used to make credentialed requests on the server, as it inherits the `cookie` and `authorization` headers for the page request.
	 * - It can make relative requests on the server (ordinarily, `fetch` requires a URL with an origin when used in a server context).
	 * - Internal requests (e.g. for `+server.js` routes) go directly to the handler function when running on the server, without the overhead of an HTTP call.
	 * - During server-side rendering, the response will be captured and inlined into the rendered HTML by hooking into the `text` and `json` methods of the `Response` object. Note that headers will _not_ be serialized, unless explicitly included via [`filterSerializedResponseHeaders`](https://svelte.dev/docs/kit/hooks#handle)
	 * - During hydration, the response will be read from the HTML, guaranteeing consistency and preventing an additional network request.
	 *
	 * You can learn more about making credentialed requests with cookies [here](https://svelte.dev/docs/kit/load#Cookies).
	 */
	readonly fetch: typeof fetch;
	/**
	 * The client's IP address, set by the adapter.
	 */
	readonly getClientAddress: () => string;
	/**
	 * Contains custom data that was added to the request within the [`server handle hook`](https://svelte.dev/docs/kit/hooks#handle).
	 */
	readonly locals: App.Locals;
	/**
	 * The parameters of the current route - e.g. for a route like `/blog/[slug]`, a `{ slug: string }` object.
	 *
	 * Inside `query` functions (including `query.batch` and `query.live`), accessing this property throws an error.
	 * Pass values from the page as arguments to the query instead. Inside `form` and `command` functions it relates to the page
	 * the remote function was called from, _not_ the URL of the endpoint SvelteKit creates for the remote function. Never use it
	 * to determine whether or not a user is authorized to access certain data, as these values are part of the request which could be manipulated.
	 */
	readonly params: Params;
	/**
	 * Additional data made available through the adapter.
	 */
	readonly platform: Readonly<App.Platform> | undefined;
	/**
	 * The original request object.
	 */
	readonly request: Request;
	/**
	 * Info about the current route.
	 */
	readonly route: {
		/**
		 * The ID of the current route - e.g. for `src/routes/blog/[slug]`, it would be `/blog/[slug]`. It is `null` when no route is matched.
		 *
		 * Inside `query` functions (including `query.batch` and `query.live`), accessing this property throws an error.
		 * Pass values from the page as arguments to the query instead. Inside `form` and `command` functions it relates to the page
		 * the remote function was called from, _not_ the URL of the endpoint SvelteKit creates for the remote function. Never use it
		 * to determine whether or not a user is authorized to access certain data, as these values are part of the request which could be manipulated.
		 */
		id: RouteId;
	};
	/**
	 * If you need to set headers for the response, you can do so using the this method. This is useful if you want the page to be cached, for example:
	 *
	 *	```js
	 *	/// file: src/routes/blog/+page.js
	 *	export async function load({ fetch, setHeaders }) {
	 *		const url = `https://cms.example.com/articles.json`;
	 *		const response = await fetch(url);
	 *
	 *		setHeaders({
	 *			age: response.headers.get('age'),
	 *			'cache-control': response.headers.get('cache-control')
	 *		});
	 *
	 *		return response.json();
	 *	}
	 *	```
	 *
	 * Setting the same header multiple times (even in separate `load` functions) is an error — you can only set a given header once.
	 *
	 * You cannot add a `set-cookie` header with `setHeaders` — use the [`cookies`](https://svelte.dev/docs/kit/$app-server#Cookies) API instead.
	 */
	readonly setHeaders: (headers: Record<string, string>) => void;
	/**
	 * The requested URL.
	 *
	 * Inside `query` functions (including `query.batch` and `query.live`), accessing this property throws an error.
	 * Pass values from the page as arguments to the query instead. Inside `form` and `command` functions it relates to the page
	 * the remote function was called from, _not_ the URL of the endpoint SvelteKit creates for the remote function. Never use it
	 * to determine whether or not a user is authorized to access certain data, as these values are part of the request which could be manipulated.
	 */
	readonly url: URL;
	/**
	 * `true` if the request comes from the client asking for `+page/layout.server.js` data. The `url` property will be stripped of the internal information
	 * related to the data request in this case. Use this property instead if the distinction is important to you.
	 */
	readonly isDataRequest: boolean;
	/**
	 * `true` for `+server.js` calls coming from SvelteKit without the overhead of actually making an HTTP request. This happens when you make same-origin `fetch` requests on the server.
	 */
	readonly isSubRequest: boolean;

	/**
	 * Access to spans for tracing. If tracing is not enabled, these spans will do nothing.
	 * @since 2.31.0
	 */
	readonly tracing: {
		/** Whether tracing is enabled. */
		enabled: boolean;
		/** The root span for the request. This span is named `sveltekit.handle.root`. */
		root: Span;
		/** The span associated with the current `handle` hook, `load` function, or form action. */
		current: Span;
	};

	/**
	 * `true` if the request comes from the client via a remote function. The `url` property will be stripped of the internal information
	 * related to the data request in this case. Use this property instead if the distinction is important to you.
	 */
	readonly isRemoteRequest: boolean;
}

// If T is unknown or has an index signature, the types below will recurse indefinitely and create giant unions that TS can't handle
type WillRecurseIndefinitely<T> = unknown extends T ? true : string extends keyof T ? true : false;

// Input type mappings for form fields
type InputTypeMap = {
	text: string;
	email: string;
	password: string;
	url: string;
	tel: string;
	search: string;
	number: number;
	range: number;
	date: string;
	'datetime-local': string;
	time: string;
	month: string;
	week: string;
	color: string;
	checkbox: boolean | string[];
	radio: string;
	file: File;
	hidden: string | number | boolean;
	submit: string | number | boolean;
	button: string;
	reset: string;
	image: string;
	select: string;
	'select multiple': string[];
	'file multiple': File[];
};

// Valid input types for a given value type
export type RemoteFormFieldType<T> = {
	[K in keyof InputTypeMap]: T extends InputTypeMap[K] ? K : never;
}[keyof InputTypeMap];

// Input element properties based on type
type InputElementProps<T extends keyof InputTypeMap> = T extends 'checkbox' | 'radio'
	? {
			name: string;
			type: T;
			value?: string;
			'aria-invalid': boolean | 'false' | 'true' | undefined;
			get checked(): boolean;
			set checked(value: boolean);
			readonly defaultChecked?: boolean;
		}
	: T extends 'file'
		? {
				name: string;
				type: 'file';
				'aria-invalid': boolean | 'false' | 'true' | undefined;
				get files(): FileList | null;
				set files(v: FileList | null);
			}
		: T extends 'select'
			? {
					name: string;
					'aria-invalid': boolean | 'false' | 'true' | undefined;
					get value(): string;
					set value(v: string);
				}
			: T extends 'select multiple'
				? {
						name: string;
						multiple: true;
						'aria-invalid': boolean | 'false' | 'true' | undefined;
						get value(): string[];
						set value(v: string[]);
					}
				: T extends 'text'
					? {
							name: string;
							'aria-invalid': boolean | 'false' | 'true' | undefined;
							get value(): string | number;
							set value(v: string | number);
							readonly defaultValue?: string | number;
						}
					: {
							name: string;
							type: T;
							'aria-invalid': boolean | 'false' | 'true' | undefined;
							get value(): string | number;
							set value(v: string | number);
							readonly defaultValue?: string | number;
						};

type RemoteFormFieldMethods<T> = {
	/** The values that will be submitted */
	value(): DeepPartial<T>;
	/** Set the values that will be submitted */
	set(input: DeepPartial<T>): DeepPartial<T>;
	/** Whether the field or any nested field has been interacted with since the form was mounted */
	touched(): boolean;
	/** Whether the field or any nested field has been edited since the form was mounted */
	dirty(): boolean;
	/** Validation issues, if any */
	issues(): RemoteFormIssue[] | undefined;
};

// These two types use "T extends unknown ? .. : .." to distribute over unions.
// Example: if "type T = A | b" then "keyof T" only contains keys that both A and B have, with "KeysOfUnion<T>" we get the keys of both A and B
type KeysOfUnion<T> = T extends unknown ? keyof T : never;
type ValueOfUnionKey<T, K extends PropertyKey> = T extends unknown
	? K extends keyof T
		? T[K]
		: never
	: never;

export type RemoteFormFieldValue = string | string[] | number | boolean | File | File[];

type AsArgs<Type extends keyof InputTypeMap, Value> = Type extends 'checkbox'
	? Value extends string[]
		? [type: Type, value: Value[number] | (string & {})]
		: Value extends boolean
			? [type: Type] | [type: Type, value: boolean]
			: [type: Type] | [type: Type, value: Value | (string & {})]
	: Type extends 'submit' | 'hidden'
		? Value extends string
			? [type: Type, value: Value | (string & {})]
			: [type: Type, value: Value]
		: Type extends 'radio'
			? [type: Type, value: Value | (string & {})]
			: Type extends 'file' | 'file multiple'
				? [type: Type]
				: [type: Type] | [type: Type, value: Value | undefined];

/**
 * Form field accessor type that provides name(), value(), and issues() methods
 */
export type RemoteFormField<Value extends RemoteFormFieldValue> = RemoteFormFieldMethods<Value> & {
	/**
	 * Returns an object that can be spread onto an input element with the correct type attribute,
	 * aria-invalid attribute if the field is invalid, and appropriate value/checked property getters/setters.
	 * @example
	 * ```svelte
	 * <input {...myForm.fields.myString.as('text')} />
	 * <input {...myForm.fields.myNumber.as('number')} />
	 * <input {...myForm.fields.myBoolean.as('checkbox')} />
	 * ```
	 */
	as<T extends RemoteFormFieldType<Value>>(...args: AsArgs<T, Value>): InputElementProps<T>;
};

type RemoteFormFieldContainer<Value> = RemoteFormFieldMethods<Value> & {
	/** Validation issues belonging to this or any of the fields that belong to it, if any */
	allIssues(): RemoteFormIssue[] | undefined;
};

type UnknownField<Value> = RemoteFormFieldMethods<Value> & {
	/** Validation issues belonging to this or any of the fields that belong to it, if any */
	allIssues(): RemoteFormIssue[] | undefined;
	/**
	 * Returns an object that can be spread onto an input element with the correct type attribute,
	 * aria-invalid attribute if the field is invalid, and appropriate value/checked property getters/setters.
	 * @example
	 * ```svelte
	 * <input {...myForm.fields.myString.as('text')} />
	 * <input {...myForm.fields.myNumber.as('number')} />
	 * <input {...myForm.fields.myBoolean.as('checkbox')} />
	 * ```
	 */
	as<T extends RemoteFormFieldType<Value>>(...args: AsArgs<T, Value>): InputElementProps<T>;
} & {
	[key: string | number]: UnknownField<any>;
};

type RemoteFormFieldsRoot<Input extends RemoteFormInput | void> =
	IsAny<Input> extends true
		? RecursiveFormFields
		: Input extends void
			? {
					/** Validation issues, if any */
					issues(): RemoteFormIssue[] | undefined;
					/** Validation issues belonging to this or any of the fields that belong to it, if any */
					allIssues(): RemoteFormIssue[] | undefined;
				}
			: RemoteFormFields<Input>;

/**
 * Recursive type to build form fields structure with proxy access
 */
export type RemoteFormFields<T> =
	WillRecurseIndefinitely<T> extends true
		? RecursiveFormFields
		: NonNullable<T> extends string | number | boolean | File
			? RemoteFormField<NonNullable<T>>
			: // [NonNullable<T>] is used to prevent distributing over union while still allowing
				// nullable wrappers (e.g. `string[] | undefined` from a schema with `.default([])`)
				// to be treated as arrays; only the last condition should distribute over unions
				[NonNullable<T>] extends [string[] | File[]]
				? RemoteFormField<NonNullable<T>> & {
						[K in number]: RemoteFormField<NonNullable<T>[number]>;
					}
				: [NonNullable<T>] extends [Array<infer U>]
					? RemoteFormFieldContainer<NonNullable<T>> & {
							[K in number]: RemoteFormFields<U>;
						}
					: RemoteFormFieldContainer<T> & {
							[K in KeysOfUnion<T>]-?: RemoteFormFields<ValueOfUnionKey<T, K>>;
						};

// By breaking this out into its own type, we avoid the TS recursion depth limit
type RecursiveFormFields = RemoteFormFieldContainer<any> & {
	[key: string | number]: UnknownField<any>;
};

type MaybeArray<T> = T | T[];

export interface RemoteFormInput {
	[key: string]: MaybeArray<string | number | boolean | File | RemoteFormInput> | undefined;
}

export interface RemoteFormIssue {
	message: string;
	path: Array<string | number>;
}

// If the schema specifies `id` as a string or number, ensure that `for(...)`
// only accepts that type. Otherwise, accept `string | number`
type ExtractId<Input> = Input extends { id: infer Id }
	? Id extends string | number
		? Id
		: string | number
	: string | number;

/**
 * A function and proxy object used to imperatively create validation errors in form handlers.
 *
 * Access properties to create field-specific issues: `issue.fieldName('message')`.
 * The type structure mirrors the input data structure for type-safe field access.
 * Call `invalid(issue.foo(...), issue.nested.bar(...))` to throw a validation error.
 */
export type InvalidField<T> =
	WillRecurseIndefinitely<T> extends true
		? Record<string | number, any>
		: NonNullable<T> extends string | number | boolean | File
			? (message: string) => StandardSchemaV1.Issue
			: NonNullable<T> extends Array<infer U>
				? {
						[K in number]: InvalidField<U>;
					} & ((message: string) => StandardSchemaV1.Issue)
				: NonNullable<T> extends RemoteFormInput
					? {
							[K in keyof T]-?: InvalidField<T[K]>;
						} & ((message: string) => StandardSchemaV1.Issue)
					: Record<string, never>;

/**
 * A validation error thrown by `invalid`.
 */
export interface ValidationError {
	/** The validation issues */
	issues: StandardSchemaV1.Issue[];
}

/**
 * The form instance as received inside an `enhance` callback. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
 */
export type RemoteFormEnhanceInstance<
	Input extends RemoteFormInput | void = RemoteFormInput | void,
	Output = any
> = Omit<RemoteForm<Input, Output>, 'enhance' | 'element'> & {
	readonly element: HTMLFormElement;
};

/**
 * The callback passed to a remote form's `enhance` method. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
 */
export type RemoteFormEnhanceCallback<
	Input extends RemoteFormInput | void = RemoteFormInput | void,
	Output = any
> = (form: RemoteFormEnhanceInstance<Input, Output>) => MaybePromise<void>;

/**
 * The type of a remote `form` function. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
 */
export type RemoteForm<Input extends RemoteFormInput | void, Output> = {
	/** Attachment that sets up an event handler that intercepts the form submission on the client to prevent a full page reload */
	[attachment: symbol]: (node: HTMLFormElement) => void;
	method: 'POST';
	/** The URL to send the form to. */
	action: string;
	/** The `<form>` element this instance is currently attached to, if any. */
	get element(): HTMLFormElement | null;
	/** Submit the currently attached form programmatically. */
	submit(): Promise<boolean> & {
		updates: (...updates: RemoteQueryUpdate[]) => Promise<boolean>;
	};
	/** Use the `enhance` method to influence what happens when the form is submitted. */
	enhance(callback: RemoteFormEnhanceCallback<Input, Output>): {
		method: 'POST';
		action: string;
		[attachment: symbol]: (node: HTMLFormElement) => void;
	};
	/**
	 * Create an instance of the form for the given `id`.
	 * The `id` is stringified and used for deduplication to potentially reuse existing instances.
	 * Useful when you have multiple forms that use the same remote form action, for example in a loop.
	 * ```svelte
	 * {#each todos as todo}
	 *	{const todoForm = updateTodo.for(todo.id)}
	 *	<form {...todoForm}>
	 *		{#if todoForm.result?.invalid}<p>Invalid data</p>{/if}
	 *		...
	 *	</form>
	 *	{/each}
	 * ```
	 */
	for(id: ExtractId<Input>): Omit<RemoteForm<Input, Output>, 'for'>;
	/** Preflight checks */
	preflight(schema: StandardSchemaV1<Input, any>): RemoteForm<Input, Output>;
	/** Validate the form contents programmatically */
	validate(options?: {
		/**
		 * Set this to `true` to also show validation issues of fields that haven't yet been
		 * edited and blurred. This option is ignored for forms that have previously been
		 * submitted, in which case all fields are always subject to validation
		 * (unless the form is reset, at which point it is treated as pristine)
		 */
		all?: boolean;
		/** Set this to `true` to only run the `preflight` validation. */
		preflightOnly?: boolean;
	}): Promise<void>;
	/** The result of the form submission */
	get result(): Output | undefined;
	/** The number of pending submissions */
	get pending(): number;
	/** True if the form has been submitted at least once, and hasn't been reset since */
	get submitted(): boolean;
	/** Access form fields using object notation */
	fields: RemoteFormFieldsRoot<Input>;
};

/**
 * The type of a remote `command` function. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#command) for full documentation.
 */
export type RemoteCommand<Input, Output> = {
	(arg: undefined extends Input ? Input | void : Input): Promise<Output> & {
		updates(...updates: RemoteQueryUpdate[]): Promise<Output>;
	};
	/** The number of pending command executions */
	get pending(): number;
};

export type RemoteQueryUpdate =
	| RemoteQuery<any>
	| RemoteLiveQuery<any>
	| RemoteQueryFunction<any, any>
	| RemoteLiveQueryFunction<any, any>
	| RemoteQueryOverride;

export type RemoteResource<T> = Promise<T> & {
	/** The error in case the query fails. */
	get error(): App.Error | undefined;
	/** `true` before the first result is available and during refreshes */
	get loading(): boolean;
} & (
		| {
				/** The current value of the query. Undefined until `ready` is `true` */
				get current(): undefined;
				ready: false;
		  }
		| {
				/** The current value of the query. Undefined until `ready` is `true` */
				get current(): T;
				ready: true;
		  }
	);

export type RemoteQuery<T> = RemoteResource<T> & {
	/**
	 * On the client, this function will update the value of the query without re-fetching it.
	 *
	 * On the server, this can be called in the context of a `command` or `form` and the specified data will accompany the action response back to the client.
	 * This prevents SvelteKit needing to refresh all queries on the page in a second server round-trip.
	 */
	set(value: T): void;
	/**
	 * On the client, this function will re-fetch the query from the server.
	 *
	 * On the server, this can be called in the context of a `command` or `form` and the refreshed data will accompany the action response back to the client.
	 * This prevents SvelteKit needing to refresh all queries on the page in a second server round-trip.
	 */
	refresh(): Promise<void>;
	/**
	 * Temporarily override a query's value during a [single-flight mutation](https://svelte.dev/docs/kit/remote-functions#Single-flight-mutations) to provide optimistic updates.
	 *
	 * ```svelte
	 * <script>
	 *   import { getTodos, addTodo } from './todos.remote.js';
	 *   const todos = getTodos();
	 * </script>
	 *
	 * <form {...addTodo.enhance(async (form) => {
	 *   await form.submit().updates(
	 *     todos.withOverride((todos) => [...todos, { text: form.fields.text.value() }])
	 *   );
	 * })}>
	 *   <input type="text" name="text" />
	 *   <button type="submit">Add Todo</button>
	 * </form>
	 * ```
	 */
	withOverride(update: (current: T) => T): RemoteQueryOverride;
};

export type RemoteLiveQuery<T> = RemoteResource<T> &
	AsyncIterable<T> & {
		/** `true` if the live stream is currently connected. */
		readonly connected: boolean;
		/** `true` once the current live stream iterator is done. */
		readonly done: boolean;
		/** Reconnects the live stream immediately. */
		reconnect(): Promise<void>;
	};

export type RemoteQueryOverride = () => void;

/**
 * The type of a remote `prerender` function. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#prerender) for full documentation.
 */
export type RemotePrerenderFunction<Input, Output> = (
	arg: undefined extends Input ? Input | void : Input
) => RemoteResource<Output>;

/**
 * The return value of a remote `query` function. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query) for full documentation.
 *
 * The optional `Validated` generic parameter represents the argument type *after* the
 * query's schema has validated and (optionally) transformed it — this is the type the
 * query's implementation function receives on the server, and the type yielded by
 * [`requested`](https://svelte.dev/docs/kit/$app-server#requested). For queries declared
 * with [Standard Schema](https://standardschema.dev/) it differs from `Input` when the
 * schema contains a transform (e.g. `v.pipe(v.number(), v.transform(String))` has
 * `Input = number` but `Validated = string`). For `'unchecked'` validators and queries
 * without arguments it defaults to `Input`.
 */
export type RemoteQueryFunction<Input, Output, _Validated = Input> = (
	arg: undefined extends Input ? Input | void : Input
) => RemoteQuery<Output>;

/**
 * The type of a remote `query.live` function. See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.live) for full documentation.
 *
 * The optional `Validated` generic parameter represents the argument type *after* the
 * query's schema has validated and (optionally) transformed it, and matches the type
 * yielded by [`requested`](https://svelte.dev/docs/kit/$app-server#requested).
 */
export type RemoteLiveQueryFunction<Input, Output, _Validated = Input> = (
	arg: undefined extends Input ? Input | void : Input
) => RemoteLiveQuery<Output>;

/**
 * A single entry yielded by [`requested`](https://svelte.dev/docs/kit/$app-server#requested)
 * when called with a regular `query`. `arg` is the validated argument (the input *after*
 * the query's schema validated and transformed it, if applicable); `query` is a
 * `RemoteQuery` bound to the client's original cache key, so `refresh()` / `set()` will
 * update the correct client entry.
 */
export type RequestedEntry<Validated, Output> = {
	arg: Validated;
	query: RemoteQuery<Output>;
};

/**
 * A single entry yielded by [`requested`](https://svelte.dev/docs/kit/$app-server#requested)
 * when called with a `query.live`. `arg` is the validated argument; `query` is a
 * `RemoteLiveQuery` bound to the client's original cache key, so `reconnect()` targets
 * the correct client subscription.
 */
export type LiveRequestedEntry<Validated, Output> = {
	arg: Validated;
	query: RemoteLiveQuery<Output>;
};

export type QueryRequestedResult<Validated, Output> = Iterable<RequestedEntry<Validated, Output>> &
	AsyncIterable<RequestedEntry<Validated, Output>> & {
		/**
		 * Call `refresh` on all queries selected by this `requested` invocation.
		 * This is identical to:
		 * ```ts
		 * import { requested } from '$app/server';
		 *
		 * for await (const { query } of requested(getPost, ...)) {
		 *   void query.refresh();
		 * }
		 * ```
		 */
		refreshAll: () => Promise<void>;
	};

export type LiveQueryRequestedResult<Validated, Output> = Iterable<
	LiveRequestedEntry<Validated, Output>
> &
	AsyncIterable<LiveRequestedEntry<Validated, Output>> & {
		/**
		 * Call `reconnect` on all live queries selected by this `requested` invocation.
		 * This is identical to:
		 * ```ts
		 * import { requested } from '$app/server';
		 *
		 * for await (const { query } of requested(liveQuery, ...)) {
		 *   void query.reconnect();
		 * }
		 * ```
		 */
		reconnectAll: () => Promise<void>;
	};

export type RequestedResult<Validated, Output> =
	| QueryRequestedResult<Validated, Output>
	| LiveQueryRequestedResult<Validated, Output>;
