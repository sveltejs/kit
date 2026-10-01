## request_event_unavailable

> Can only read the current request event inside functions invoked during `handle`, such as server `load` functions, actions, endpoints, and other server hooks.

[`getRequestEvent`](https://svelte.dev/docs/kit/$app-server#getRequestEvent) returns the event of the request that SvelteKit is currently handling, so it only works while that request is being handled — in `handle`, server `load` functions, form actions, `+server` handlers, remote functions and the functions they call. It can't be used at the top level of a module, in `init`, or in code that runs after the response has been sent, such as a `setTimeout` callback. Pass the values you need from the event to that code instead.

## request_event_after_await

> Can only read the current request event inside functions invoked during `handle`, such as server `load` functions, actions, endpoints, and other server hooks. In environments without `AsyncLocalStorage`, the event must be read synchronously, not after an `await`.

[`getRequestEvent`](https://svelte.dev/docs/kit/$app-server#getRequestEvent) uses [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage) to find the current request after an `await`. This environment doesn't provide it, so the event can only be read synchronously, before the first `await` of the function that SvelteKit called:

```js
import { getRequestEvent } from '$app/server';

export async function load() {
	// read the event first...
	const event = getRequestEvent();

	// ...and then await
	const user = await get_user(event.cookies.get('session'));

	return { user };
}
```

Otherwise, the function was called outside of `handle`, server `load` functions, actions or endpoints, where there's no current request.

## request_store_after_await

> Could not get the request store. In environments without `AsyncLocalStorage`, the request store (used by e.g. remote functions) must be accessed synchronously, not after an `await`. If it was accessed synchronously then this is an internal error.

Some SvelteKit APIs, such as [remote functions](https://svelte.dev/docs/kit/remote-functions), need to know which request they are part of. They use [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage) to find it after an `await`, but this environment doesn't provide it. Call these APIs synchronously, before the first `await` of the function that SvelteKit called. If that's already the case, please [open an issue](https://github.com/sveltejs/kit/issues).

## client_address_unsupported

> `%adapter%` does not specify `getClientAddress`. Please raise an issue

[`event.getClientAddress()`](https://svelte.dev/docs/kit/@sveltejs-kit#RequestEvent) returns the address provided by your [adapter](https://svelte.dev/docs/kit/adapters), and this adapter doesn't provide one. Raise an issue with the adapter's maintainers. In the meantime, if your app is behind a proxy that forwards the client's address, you can read it from a header such as `x-forwarded-for` with `event.request.headers.get(...)`.

## set_headers_cookie

> Use `event.cookies.set(name, value, options)` instead of `event.setHeaders` to set cookies

`setHeaders` can't set `set-cookie`, because a response can contain several `set-cookie` headers and SvelteKit needs to know about cookies to apply them correctly — for example, to [forward them to `fetch` requests](https://svelte.dev/docs/kit/load#Cookies) and to read them back with `cookies.get` during the same request. Use [`cookies.set`](https://svelte.dev/docs/kit/@sveltejs-kit#Cookies) instead.

## header_already_set

> `%name%` header is already set

[`setHeaders`](https://svelte.dev/docs/kit/load#Headers) can only set each header once per request (except `server-timing`, whose values are combined), because otherwise it would be unclear which value should win. This often happens when both a layout and a page `load` function set the same header, such as `cache-control`. Set the header in one place only. To change a header of the finished response, use `response.headers.set(...)` in the [`handle`](https://svelte.dev/docs/kit/hooks#Server-hooks-handle) hook instead.

## cookies_set_after_response

> Cannot use `cookies.set(...)` after the response has been generated

Cookies are sent in the headers of the response, so they can't be changed once the response has been created. This usually happens when `cookies.set` is called in code that runs later, such as a promise that is [streamed](https://svelte.dev/docs/kit/load#Streaming-with-promises) from a `load` function, or a callback that runs after `handle` has returned. Set cookies before your `load` function, action or handler returns.

## set_headers_after_response

> Cannot use `setHeaders(...)` after the response has been generated

Headers are sent before the body of a response, so they can't be changed once the response has been created. This usually happens when `setHeaders` is called in code that runs later, such as a promise that is [streamed](https://svelte.dev/docs/kit/load#Streaming-with-promises) from a `load` function, or a callback that runs after `handle` has returned. Set headers before your `load` function or action returns.

## cookies_serialize_before_route

> Cannot serialize cookies until after the route is determined

[`cookies.serialize`](https://svelte.dev/docs/kit/@sveltejs-kit#Cookies) resolves the cookie's `path` against the current route, whose trailing slash depends on the [`trailingSlash`](https://svelte.dev/docs/kit/page-options#trailingSlash) option. The route isn't known until SvelteKit has matched the request, so calling `serialize` in `handle` before `resolve` fails for cookies on the current hostname. Call it after `resolve`, or in `load` functions, actions and endpoints. If you only need to set the cookie, use `cookies.set` instead, which waits for the route to be determined.

## cookie_too_large

> Cookie `%name%` is too large, and will be discarded by the browser

Browsers ignore cookies whose name and value are larger than 4096 bytes, so this cookie would silently never be sent back. Store less data in the cookie — for example, a session ID that refers to data stored on the server. This is only checked during development.

## fetch_response_decoded

> Cannot return `fetch(...)` directly from a handler if the response has a `Content-Encoding: %encoding%` header. The body has already been decoded

When you `fetch` a compressed response, the body you read from it has already been decompressed, but its headers still say that it's compressed. Returning that response as-is would make the browser try to decompress it again. Create a new response without the `content-encoding` (and `content-length`) headers instead:

```js
/// file: src/routes/proxy/+server.js
export async function GET({ fetch }) {
	const response = await fetch('https://example.com/data');

	const headers = new Headers(response.headers);
	headers.delete('content-encoding');
	headers.delete('content-length');

	return new Response(response.body, { status: response.status, headers });
}
```

## endpoint_invalid_response

> Invalid response from route `%path%`: handler should return a `Response` object

Request handlers in [`+server`](https://svelte.dev/docs/kit/routing#server) files must return a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response). Check that every code path returns one — a missing `return` is a common cause. You can use the [`json`](https://svelte.dev/docs/kit/@sveltejs-kit#json) and [`text`](https://svelte.dev/docs/kit/@sveltejs-kit#text) helpers from `@sveltejs/kit` to create responses.
