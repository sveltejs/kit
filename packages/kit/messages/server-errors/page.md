## action_throw_fail

> Cannot `throw fail()`. Use `return fail()`

[`fail`](https://svelte.dev/docs/kit/@sveltejs-kit#fail) creates a value that a form action returns to report a [validation error](https://svelte.dev/docs/kit/form-actions#Anatomy-of-an-action-Validation-errors). Thrown values are treated as unexpected errors instead, so return it:

```js
/// file: src/routes/login/+page.server.js
import { fail } from '@sveltejs/kit';

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		if (!data.get('email')) {
			return fail(400, { missing: true });
		}
	}
};
```

## action_default_with_named

> When using named actions, the default action cannot be used. See the docs for more info: https://svelte.dev/docs/kit/form-actions#named-actions

A page can have either a single `default` [action](https://svelte.dev/docs/kit/form-actions#Default-actions) or any number of [named actions](https://svelte.dev/docs/kit/form-actions#Named-actions), but not both — a form that posts to the page without choosing an action would be ambiguous. Rename the `default` action and point the form that uses it to that name, for example with `action="?/create"`.

## action_name_reserved

> Cannot use reserved action name `default`

The request's URL chose the action named `default` with `?/default`. That name is reserved for the page's [default action](https://svelte.dev/docs/kit/form-actions#Default-actions), which is used by forms that don't choose an action. Remove the `?/default` from the form's `action` attribute (or the `formaction` of its button).

## action_return_redirect

> Cannot `return redirect(...)` — use `redirect(...)` instead

[`redirect`](https://svelte.dev/docs/kit/@sveltejs-kit#redirect) throws, so its result can't be returned. Call it without `return` — for example `redirect(303, '/login')`.

## action_return_error

> Cannot `return error(...)` — use `error(...)` or `return fail(...)` instead

[`error`](https://svelte.dev/docs/kit/@sveltejs-kit#error) throws, so its result can't be returned. Call it without `return` to show the error page, or return [`fail`](https://svelte.dev/docs/kit/@sveltejs-kit#fail) to report a [validation error](https://svelte.dev/docs/kit/form-actions#Anatomy-of-an-action-Validation-errors) back to the form instead.

## action_response_not_serializable

> Data returned from action inside `%id%` is not serializable. Form actions need to return plain objects or `fail()`. E.g. `return { success: true }` or `return fail(400, { message: "invalid" });`

Form actions return data to the page as [`form`](https://svelte.dev/docs/kit/form-actions#Anatomy-of-an-action), not as a response of their own, so they can't return a `Response` (for example one created with `json(...)`). Return a plain object instead. If you need a custom response, use a [`+server`](https://svelte.dev/docs/kit/routing#server) file.

## action_data_not_serializable

> Data returned from action inside `%id%` is not serializable: %message%

> Data returned from action inside `%id%` is not serializable: %message% (`%path%`)

The data returned from a form action is serialized with [devalue](https://github.com/sveltejs/devalue) to send it to the page, and this value isn't supported. Devalue supports JSON values as well as things like `Date`, `Map`, `Set`, `BigInt` and `URL`, but not functions or class instances. Return plain data instead, or register the type with a [transport hook](https://svelte.dev/docs/kit/hooks#Universal-hooks-transport) to tell SvelteKit how to serialize it.

## load_not_serializable

> Data returned from `load` while rendering `%id%` is not serializable: %message% (`%path%`). If you need to serialize/deserialize custom types, use transport hooks: https://svelte.dev/docs/kit/hooks#transport.

The data returned from a server `load` function is serialized with [devalue](https://github.com/sveltejs/devalue) to send it to the browser, and the value at the listed path isn't supported. Devalue supports JSON values as well as things like `Date`, `Map`, `Set`, `BigInt`, `URL` and promises, but not functions or class instances. Return plain data instead, move the value into a [universal `load`](https://svelte.dev/docs/kit/load#Universal-vs-server) function, or register the type with a [transport hook](https://svelte.dev/docs/kit/hooks#Universal-hooks-transport).

## load_not_plain_object

> Data returned from `load` while rendering `%id%` is not a plain object

A server `load` function must return a plain object (such as `return { post }`), because each of its properties becomes a property of `data`. Wrap the value you want to return in an object.

## load_promise_not_serializable

> Failed to serialize promise while rendering `%id%`

A server `load` function returned a promise, which SvelteKit [streams](https://svelte.dev/docs/kit/load#Streaming-with-promises) to the browser once it resolves. The value it resolved to can't be serialized with [devalue](https://github.com/sveltejs/devalue), so the promise is rejected in the browser instead — the `cause` of this error says which value was the problem. Resolve the promise to plain data, or register the type with a [transport hook](https://svelte.dev/docs/kit/hooks#Universal-hooks-transport).

## load_response_header_not_serialized

> Failed to get response header `%name%` — it must be included by the `filterSerializedResponseHeaders` option: https://svelte.dev/docs/kit/hooks#handle (at `%id%`)

A response fetched with `event.fetch` during server-side rendering is [serialized into the page](https://svelte.dev/docs/kit/load#Making-fetch-requests) so that `load` can use it again in the browser without making the request twice. Only headers that you choose are included, because they may contain sensitive information, so reading any other header would fail in the browser. Include the header by returning `true` for it from the [`filterSerializedResponseHeaders`](https://svelte.dev/docs/kit/hooks#Server-hooks-handle) option of `resolve`:

```js
/// file: src/hooks.server.js
export async function handle({ event, resolve }) {
	return resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-type'
	});
}
```

## load_fetch_cors

> CORS error: %reason% `Access-Control-Allow-Origin` header is present on the requested resource

Universal `load` functions also run in the browser, where a request to another origin only succeeds if that origin allows it with [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) headers. SvelteKit applies the same check when `load` runs on the server, so that the page doesn't work during server-side rendering and then fail after navigation. Allow your app's origin on the other server with an `access-control-allow-origin` header, or make the request from a [server `load`](https://svelte.dev/docs/kit/load#Universal-vs-server) function or an endpoint instead, where CORS doesn't apply.

## ssr_fetch_relative_url

> Cannot call `fetch` eagerly during server-side rendering with relative URL (`%url%`) — put your `fetch` calls inside `onMount` or a `load` function instead

During server-side rendering there's no page URL that a relative URL could be resolved against. Fetch the data in a [`load`](https://svelte.dev/docs/kit/load) function, whose `fetch` understands relative URLs and passes the data to the page, or call `fetch` in `onMount` so that it only runs in the browser.

## prerender_actions

> Cannot prerender pages with actions

A [prerendered](https://svelte.dev/docs/kit/page-options#prerender) page is saved as a static file, so there's no server to handle its [form actions](https://svelte.dev/docs/kit/form-actions). Remove `export const prerender = true` (which may also be set by a layout) from the page, or move the actions to a page that isn't prerendered.

## prerender_endpoint_methods

> Cannot prerender a `+server` file with %methods% or fallback handlers (`%id%`)

A prerendered endpoint is saved as a static file, which can only answer `GET` requests. Methods that depend on a request body, and `fallback` handlers, would stop working. Move these handlers to a route that isn't prerendered, or remove `export const prerender = true` from this one.

## prerender_endpoint_not_prerenderable

> `%id%` is not prerenderable

A prerendered page requested this `+server` route with `fetch`, but the route isn't prerendered. The prerendered page would contain its response, while the route itself wouldn't exist in the built app. Add `export const prerender = true` to the `+server` file, or stop requesting it while the page is prerendered.

## prerender_nonce

> Cannot use prerendering if `config.csp.mode === 'nonce'`

A nonce must be different for every response, but a [prerendered](https://svelte.dev/docs/kit/page-options#prerender) page is generated once and then served to everyone. Set [`csp.mode`](https://svelte.dev/docs/kit/configuration#csp) to `'auto'` or `'hash'` instead, which uses nonces only for pages that are rendered dynamically.

## prerender_template_nonce

> Cannot use prerendering if page template contains `%tag%`

A nonce must be different for every response, but a [prerendered](https://svelte.dev/docs/kit/page-options#prerender) page is generated once and then served to everyone. Remove the nonce placeholder from `src/app.html`, or don't prerender this page. SvelteKit adds the nonce to the scripts and styles it generates itself, and uses hashes instead on prerendered pages.

## csp_report_only_missing_report

> `content-security-policy-report-only` must be specified with either the `report-to` or `report-uri` directives, or both

A [report-only content security policy](https://svelte.dev/docs/kit/configuration#csp) doesn't block anything — it only reports violations. Without a `report-to` or `report-uri` directive, there's nowhere to send those reports. Add one of them to `csp.reportOnly`, or remove `csp.reportOnly`.
