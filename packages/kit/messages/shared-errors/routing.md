## param_matcher_async

> Async param matchers are not supported

[Param matchers](https://svelte.dev/docs/kit/advanced-routing#Matching) run synchronously on every navigation, both on the server and in the browser, to decide which route matches a URL. A matcher must return its result directly: a function can't be `async` or return a promise, and a [Standard Schema](https://standardschema.dev) must not use asynchronous validation (for example Valibot's `*Async` schemas or Zod's `parseAsync` refinements). Do asynchronous work in a `load` function instead.

## param_matcher_result_invalid

> Param matcher must return a string, number, boolean, or bigint

A [param matcher](https://svelte.dev/docs/kit/advanced-routing#Matching) returns the value that ends up in `params`. Because parameters come from — and can be turned back into — a URL, the value must be a string, number, boolean or bigint. Return `undefined` from a matcher function (or fail validation in a schema) when the parameter doesn't match, and parse more complex values in a `load` function.

## param_definition_invalid

> Invalid param definition

Each property of the object passed to `defineParams` must be either a function that receives the parameter as a string and returns the parsed value (or `undefined` if it doesn't match), or a [Standard Schema](https://standardschema.dev) such as one created with Valibot, Zod or ArkType:

```js
/// file: src/params.js
import { defineParams } from '@sveltejs/kit/params';
import * as v from 'valibot';

export const params = defineParams({
	locale: (param) => (param === 'en' || param === 'de' ? param : undefined),
	integer: v.pipe(v.string(), v.toNumber(), v.integer())
});
```

## route_param_missing

> Missing parameter `%name%` in route `%id%`

Resolving a route ID — for example with [`resolve`](https://svelte.dev/docs/kit/$app-paths#resolve) or the `entries` of a prerendered route — requires a value for every required parameter. Add a value for the parameter, or make it [optional](https://svelte.dev/docs/kit/advanced-routing#Optional-parameters) by renaming `[%name%]` to `[[%name%]]`. An empty string counts as missing, except for [rest parameters](https://svelte.dev/docs/kit/advanced-routing#Rest-parameters).

## route_param_slash

> Parameter `%name%` in route `%id%` cannot start or end with a slash — this would cause an invalid route like `foo/bar`

When resolving a route ID, each parameter value is inserted between the slashes of the route, so a value that starts or ends with `/` would produce an empty segment such as `foo//bar`. Trim the leading or trailing slash from the value. [Rest parameters](https://svelte.dev/docs/kit/advanced-routing#Rest-parameters) can contain slashes in between segments, such as `a/b/c`.

## route_param_value_invalid

> Parameter `%name%` in route `%id%` must be a string, number, boolean, or bigint

When resolving a route ID, parameter values are converted to strings and inserted into the pathname. Only strings, numbers, booleans and bigints can be converted unambiguously. Convert other values — such as dates or objects — to a string first, and use `undefined` to omit an [optional parameter](https://svelte.dev/docs/kit/advanced-routing#Optional-parameters).
