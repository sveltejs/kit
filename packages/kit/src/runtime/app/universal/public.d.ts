import { StandardSchemaV1 } from '@standard-schema/spec';
import { HasNonOptionalBoolean, MaybePromise } from 'types';
import { RemoteForm, RemoteFormInput, RemoteFormInvalidField, RemoteResource } from '$app/server';

/**
 * A function that, when called, releases an optimistic override created with `query.withOverride(...)`.
 */
export type UniversalQueryOverride = () => void;

/**
 * The return value of a universal `query` function.
 */
export type UniversalQuery<T> = RemoteResource<T> & {
	/** Updates the value of the query without re-running it. */
	set(value: T): void;
	/** Re-runs the query. */
	refresh(): Promise<void>;
	/**
	 * Temporarily override a query's value, for example to provide optimistic updates.
	 * Call the returned function to release the override, or pass it to `.updates(...)`
	 * of a `command` or `form` submission to release it once the mutation (and refresh) completed.
	 *
	 * ```svelte
	 * <script>
	 *   import { getTodos, addTodo } from './todos.js';
	 *   const todos = getTodos();
	 * </script>
	 *
	 * <form {...addTodo.enhance(async (form) => {
	 *   await form.submit().updates(
	 *     todos.withOverride((todos) => [...todos, { text: form.fields.text.value() }])
	 *   );
	 * })}>
	 *   <input {...addTodo.fields.text.as('text')} />
	 *   <button>Add Todo</button>
	 * </form>
	 * ```
	 */
	withOverride(update: (current: T) => T): UniversalQueryOverride;
};

/**
 * The return value of a universal `query.live` function.
 */
export type UniversalLiveQuery<T> = RemoteResource<T> &
	AsyncIterable<T> & {
		/** `true` while the underlying async iterable is being iterated. */
		readonly connected: boolean;
		/** `true` once the underlying async iterable is done. */
		readonly done: boolean;
		/** Stops the current iteration and starts a new one. */
		reconnect(): Promise<void>;
	};

/**
 * The type of a universal `query` (or `query.batch`) function.
 */
export type UniversalQueryFunction<Input, Output> = (
	arg: undefined extends Input ? Input | void : Input
) => UniversalQuery<Output>;

/**
 * The type of a universal `query.live` function.
 */
export type UniversalLiveQueryFunction<Input, Output> = (
	arg: undefined extends Input ? Input | void : Input
) => UniversalLiveQuery<Output>;

/**
 * Something that can be passed to `.updates(...)` of a universal `command` or `form` submission.
 * The given queries are refreshed once the mutation completes, and overrides are released afterwards.
 */
export type UniversalQueryUpdate =
	| UniversalQuery<any>
	| UniversalLiveQuery<any>
	| UniversalQueryFunction<any, any>
	| UniversalLiveQueryFunction<any, any>
	| UniversalQueryOverride;

/**
 * The type of a universal `command` function.
 */
export type UniversalCommand<Input, Output> = {
	(arg: undefined extends Input ? Input | void : Input): Promise<Output> & {
		/**
		 * Refresh the given queries once the command completed. If you pass an override, it is
		 * applied while the command is running and released once the refreshed data is available.
		 */
		updates(...updates: UniversalQueryUpdate[]): Promise<Output>;
	};
	/** The number of pending command executions */
	get pending(): number;
};

/**
 * The form instance as received inside an `enhance` callback.
 */
export type UniversalFormEnhanceInstance<
	Input extends RemoteFormInput | void = RemoteFormInput | void,
	Output = any
> = Omit<UniversalForm<Input, Output>, 'enhance' | 'element' | 'for'> & {
	readonly element: HTMLFormElement;
};

/**
 * The type of a universal `form`. When JavaScript is available, submissions are handled in the browser.
 * Without JavaScript, the form is submitted to the server, which runs the same handler.
 */
export type UniversalForm<Input extends RemoteFormInput | void, Output> = {
	/** Attachment that sets up an event handler that intercepts the form submission on the client to prevent a full page reload */
	[attachment: symbol]: (node: HTMLFormElement) => void;
	method: 'POST';
	/** The URL to send the form to when JavaScript is not available. */
	action: string;
	/** The `<form>` element this instance is currently attached to, if any. */
	get element(): HTMLFormElement | null;
	/** Submit the currently attached form programmatically. */
	submit(): Promise<boolean> & {
		updates: (...updates: UniversalQueryUpdate[]) => Promise<boolean>;
	};
	/** Use the `enhance` method to influence what happens when the form is submitted. */
	enhance(callback: (form: UniversalFormEnhanceInstance<Input, Output>) => MaybePromise<void>): {
		method: 'POST';
		action: string;
		[attachment: symbol]: (node: HTMLFormElement) => void;
	};
	/**
	 * Create an instance of the form for the given `id`.
	 * Useful when you have multiple forms that use the same form function, for example in a loop.
	 */
	for(
		id: Parameters<RemoteForm<Input, Output>['for']>[0]
	): Omit<UniversalForm<Input, Output>, 'for'>;
	/** Validate the form contents against the schema programmatically */
	validate(options?: {
		/**
		 * Set this to `true` to also show validation issues of fields that haven't yet been
		 * edited and blurred. This option is ignored for forms that have previously been
		 * submitted, in which case all fields are always subject to validation
		 */
		all?: boolean;
	}): Promise<void>;
	/** The result of the form submission */
	get result(): Output | undefined;
	/** The number of pending submissions */
	get pending(): number;
	/** True if the form has been submitted at least once, and hasn't been reset since */
	get submitted(): boolean;
	/** Access form fields using object notation */
	fields: RemoteForm<Input, Output>['fields'];
};

/**
 * Creates a universal query. Unlike a remote `query` from `$app/server`, it runs _wherever it is called_ —
 * on the server during server-side rendering, and in the browser after hydration. During SSR, the result
 * is serialized into the page, so that the query does not run again during hydration.
 *
 * Calls with the same argument are deduplicated: on the server per request, on the client as long as the
 * query is in use. Because the function never runs on the other side of a network boundary, there's no need
 * to validate the argument.
 *
 * Inside the function, you can use `fetch` with relative URLs — on the server, it is routed through
 * [`event.fetch`](https://svelte.dev/docs/kit/load#Making-fetch-requests).
 *
 * ```ts
 * import { query } from '$app/universal';
 *
 * export const getTodo = query(async (id: string) => {
 *   const response = await fetch(`/api/todos/${id}`);
 *   return response.json();
 * });
 * ```
 */
export function query<Output>(fn: () => MaybePromise<Output>): UniversalQueryFunction<void, Output>;
export function query<Input, Output>(
	fn: (arg: Input) => MaybePromise<Output>
): UniversalQueryFunction<Input, Output>;

export namespace query {
	/**
	 * Creates a batch query. Calls within the same macrotask are grouped into a single invocation
	 * of `fn`, which receives an array of all the arguments and returns a function that resolves
	 * each individual call.
	 *
	 * ```ts
	 * import { query } from '$app/universal';
	 *
	 * export const getWeather = query.batch(async (cityIds: string[]) => {
	 *   const response = await fetch(`/api/weather?ids=${cityIds.join(',')}`);
	 *   const lookup = new Map(await response.json());
	 *   return (cityId) => lookup.get(cityId);
	 * });
	 * ```
	 */
	function batch<Input, Output>(
		fn: (args: Input[]) => MaybePromise<(arg: Input, idx: number) => Output>
	): UniversalQueryFunction<Input, Output>;

	/**
	 * Creates a live query from a function returning an async iterable (typically an async generator).
	 * During SSR, the first value is used and serialized. In the browser, the iterable is
	 * iterated for as long as the query is in use.
	 *
	 * ```ts
	 * import { query } from '$app/universal';
	 *
	 * export const getTime = query.live(async function* () {
	 *   while (true) {
	 *     yield new Date();
	 *     await new Promise((f) => setTimeout(f, 1000));
	 *   }
	 * });
	 * ```
	 */
	function live<Output>(
		fn: () => AsyncIterable<Output> | Promise<AsyncIterable<Output>>
	): UniversalLiveQueryFunction<void, Output>;
	function live<Input, Output>(
		fn: (arg: Input) => AsyncIterable<Output> | Promise<AsyncIterable<Output>>
	): UniversalLiveQueryFunction<Input, Output>;
}

/**
 * Creates a universal command, i.e. a function that mutates data. It runs wherever it is called
 * (usually in the browser, in response to user interaction). Cannot be called during rendering.
 *
 * ```ts
 * import { command } from '$app/universal';
 *
 * export const deleteTodo = command(async (id: string) => {
 *   await fetch(`/api/todos/${id}`, { method: 'DELETE' });
 * });
 * ```
 */
export function command<Output>(fn: () => MaybePromise<Output>): UniversalCommand<void, Output>;
export function command<Input, Output>(
	fn: (arg: Input) => MaybePromise<Output>
): UniversalCommand<Input, Output>;

/**
 * Creates a universal form object that can be spread onto a `<form>` element.
 *
 * When JavaScript is available, the submission is handled in the browser: the data is validated against
 * the schema (populating `issues()` if invalid), and the handler runs locally. Without JavaScript, the
 * form is submitted to the server, which runs the same validation and handler, then renders the page.
 *
 * ```ts
 * import * as v from 'valibot';
 * import { form } from '$app/universal';
 *
 * export const addTodo = form(v.object({ text: v.pipe(v.string(), v.nonEmpty()) }), async (todo) => {
 *   await fetch('/api/todos', { method: 'POST', body: JSON.stringify(todo) });
 * });
 * ```
 */
export function form<Output>(fn: () => MaybePromise<Output>): UniversalForm<void, Output>;
export function form<Input extends RemoteFormInput, Output>(
	validate: 'unchecked',
	fn: (data: Input, issue: RemoteFormInvalidField<Input>) => MaybePromise<Output>
): UniversalForm<Input, Output>;
export function form<Schema extends StandardSchemaV1<RemoteFormInput, Record<string, any>>, Output>(
	validate: true extends HasNonOptionalBoolean<StandardSchemaV1.InferInput<Schema>>
		? 'Error: All booleans in form schemas must be optional (e.g. `v.optional(v.boolean(), false)`) because checkbox inputs do not send a false value when unchecked.'
		: Schema,
	fn: (
		data: StandardSchemaV1.InferOutput<Schema>,
		issue: RemoteFormInvalidField<StandardSchemaV1.InferInput<Schema>>
	) => MaybePromise<Output>
): UniversalForm<StandardSchemaV1.InferInput<Schema>, Output>;
