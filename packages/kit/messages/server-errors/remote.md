## remote_invalid_validator

> Invalid validator passed to remote function. Expected `'unchecked'` or a Standard Schema (https://standardschema.dev)

Pass a [Standard Schema](https://standardschema.dev) validator as the first argument to a [remote function](https://svelte.dev/docs/kit/remote-functions), followed by its callback. Libraries such as Valibot, Zod and ArkType implement this interface. Use `'unchecked'` only when you intentionally handle validation yourself. A function without an input argument can be declared with just its callback.

## remote_headers_forbidden

> `setHeaders` is not allowed in remote functions

Remote functions can run inside another request or share a response with other queries, so they cannot set response headers. Set headers in a server `load` function, endpoint or `handle` hook instead.

## remote_cookie_forbidden

> Cannot %operation% cookies in `query` or `prerender` functions

Queries and prerender functions read data rather than mutate it. Set or delete cookies inside a remote `command` or `form` handler instead, or in an endpoint or form action. Reading cookies is allowed.

## remote_cookie_path_relative

> Cookies %operation% in remote functions must have an absolute path

Remote functions can be invoked from different pages, so a relative cookie path would depend on which page invoked them. Pass an absolute `path`, such as `'/'`, to `cookies.set` or `cookies.delete`. Use the same path when deleting a cookie as when setting it.

## remote_request_property

> Cannot access `event.%property%` in a query. Pass the value as an argument to the query instead

A query's cache key is determined by its argument, not by the page that calls it. Read `url`, `params` or `route` in the caller and pass the required value as an argument so that different values produce different cache entries. This also applies to queries nested inside live queries.

## remote_query_live_not_iterable

> `query.live` `%name%` must return an `Iterator`, `Iterable`, `AsyncIterator` or `AsyncIterable`

A [`query.live`](https://svelte.dev/docs/kit/remote-functions#query.live) callback must provide a sequence of values. Use an async generator (`async function*`) and `yield` values, or return an iterator or iterable. Returning a single object or a promise of a single value is not sufficient; use a regular `query` for that.

## remote_query_live_no_value

> `query.live` `%name%` did not yield a value

When a live query is awaited on the server, it must yield at least one value before completing. Check for branches that return without yielding. Yield an initial value (including `null` if appropriate) before waiting for updates.

## remote_query_prerender

> Cannot call `%type%` `%name%` while prerendering, as prerendered pages need static data. Use `prerender` from `$app/server` instead

Regular, batched and live queries fetch runtime data, while a prerendered page must be generated at build time. Use [`prerender`](https://svelte.dev/docs/kit/remote-functions#prerender) for static data, or disable prerendering for pages that need these queries.

## remote_command_readonly

> Cannot call a command (`%name%`) inside a query or prerender function

Commands mutate data, so they cannot run inside a query or prerender function. Invoke the command from a browser event handler, a remote form handler, a form action or an endpoint that handles a mutative HTTP method.

## remote_command_method

> Cannot call a command (`%name%`) from a `%method%` handler

Commands mutate data and cannot be invoked by read-only HTTP requests. Use a handler for `POST`, `PUT`, `PATCH` or `DELETE`, or invoke the command from a browser event handler. Do not change state in `load` functions.

## remote_command_render

> Cannot call a command (`%name%`) during server-side rendering

Rendering must not mutate application state. Call the command in response to a user interaction, such as a button click, or use a remote form for progressively enhanced submissions.

## remote_form_fail

> `fail(...)` is for form actions. A remote `form` handler should call `invalid(...)` instead. See https://svelte.dev/docs/kit/remote-functions#form-Programmatic-validation

[`fail`](https://svelte.dev/docs/kit/@sveltejs-kit#fail) returns an action failure for a page's form actions. Remote forms use [`invalid`](https://svelte.dev/docs/kit/@sveltejs-kit#invalid) to report validation issues. Call `invalid(issue.field('Message'))` with the issue builder supplied to the form callback, or pass issue strings for errors that apply to the whole form. Do not return or throw the result of `fail` from a remote form handler.

## remote_module_default_export

> Cannot export `default` from a remote module (`%file%`) — please use named exports instead

Each remote function needs a named export so SvelteKit can identify it in requests and generate its client implementation. Replace the default export with a named export created by `query`, `query.batch`, `query.live`, `command`, `form` or `prerender` from `$app/server`.

## remote_module_invalid_export

> `%name%` exported from `%file%` is invalid — all exports from this file must be remote functions

A `.remote.js` or `.remote.ts` module can only export remote functions created with `$app/server`. Keep helper values private, or move values that other modules need into a separate module. Type-only exports are allowed in TypeScript because they are erased at runtime.

## remote_requested_invalid_query

> `requested(...)` expects a query function created with `query(...)`, `query.batch(...)`, or `query.live(...)`

Pass the query function itself to [`requested`](https://svelte.dev/docs/kit/remote-functions#Single-flight-mutations-Client-requested-refreshes), not a query resource returned by calling it. Commands, forms and prerender functions are not queries.

## remote_requested_context

> `requested(...)` can only be called in the context of a command/form remote function

`requested` reads the queries that a client asked a mutation to refresh or reconnect. Use it inside a remote `command` or `form` callback, where that request information exists, rather than in a `load` function, endpoint or query.

## remote_requested_async_validator

> `requested(%name%, %limit%)` cannot be used with synchronous iteration because the query validator is async. Use `for await ... of` instead

Standard Schema validation can be asynchronous. Iterate the result of `requested` with `for await (const { arg, query } of requested(...))` so validation completes before you use each entry. `refreshAll`, `reconnectAll` and `ignoreAll` already use asynchronous iteration.

## remote_requested_wrong_method

> `%method%()` is invalid for %type% queries. Use `%replacement%()` instead.

Use `refreshAll()` for regular and batched queries, and `reconnectAll()` for live queries. A live query needs to restart its stream rather than perform a one-off fetch. Call the appropriate method on the result of `requested`.

## remote_requested_invalid_limit

> Limit must be a non-negative integer or `Infinity`

The second argument to `requested` limits how many client-requested query instances the mutation will handle. Pass a non-negative integer, or `Infinity` to handle all instances. Negative numbers, fractions and `NaN` are not valid limits.
