## load_tracking_after_return

> %id%: %usage% in a promise handler after `load(...)` has returned will not cause the function to re-run when %change%

SvelteKit [tracks](https://svelte.dev/docs/kit/load#Rerunning-load-functions) which parts of the `load` event (such as `url`, `params`, `parent` and `depends`) a server `load` function uses while it runs, so that it only reruns when they change. Uses in a callback that runs after `load` has returned — for example in the `.then` of a [streamed](https://svelte.dev/docs/kit/load#Streaming-with-promises) promise — can't be tracked any more. Read the value before `load` returns and use that copy in the callback:

```js
/// file: src/routes/blog/[slug]/+page.server.js
export function load({ params }) {
	const { slug } = params; // tracked

	return {
		comments: get_post(slug).then((post) => get_comments(post.id, slug))
	};
}
```

This is only checked during development.

## form_action_error_without_ssr

> The form action returned an error, but +error.svelte wasn't rendered because SSR is off. To get the error page with CSR, enhance your form with `use:enhance`. See https://svelte.dev/docs/kit/form-actions#progressive-enhancement-use-enhance

Without JavaScript, a form submission loads a new page, which is where the [error page](https://svelte.dev/docs/kit/routing#error) for a failed action would appear. With [`ssr = false`](https://svelte.dev/docs/kit/page-options#ssr) that page is only rendered in the browser, which can't see the result of a submission it didn't make. Enhance the form with [`use:enhance`](https://svelte.dev/docs/kit/form-actions#Progressive-enhancement-use:enhance), so that the browser submits it and receives the result. This is only checked during development.

## form_action_data_without_ssr

> The form action returned a value, but it isn't available in `page.form`, because SSR is off. To handle the returned value in CSR, enhance your form with `use:enhance`. See https://svelte.dev/docs/kit/form-actions#progressive-enhancement-use-enhance

Without JavaScript, a form submission loads a new page, which would get the action's data as [`form`](https://svelte.dev/docs/kit/form-actions#Anatomy-of-an-action). With [`ssr = false`](https://svelte.dev/docs/kit/page-options#ssr) that page is only rendered in the browser, which can't see the result of a submission it didn't make, so the data is lost. Enhance the form with [`use:enhance`](https://svelte.dev/docs/kit/form-actions#Progressive-enhancement-use:enhance), so that the browser submits it and receives the result. This is only checked during development.

## ssr_fetch_eager

> Avoid calling `fetch` eagerly during server-side rendering — put your `fetch` calls inside `onMount` or a `load` function instead

A component called `fetch` while it was rendered on the server. That request runs again when the component hydrates in the browser, and the server-rendered HTML can't wait for it. Fetch the data in a [`load`](https://svelte.dev/docs/kit/load) function, which runs once and passes the result to the page (and whose responses are reused in the browser), or call `fetch` in `onMount` so that it only runs in the browser. This is only checked during development.

## transform_page_chunk_comments

> Removing comments in transformPageChunk can break Svelte's hydration

Svelte adds HTML comments to server-rendered markup that it uses to hydrate the page in the browser, and the [`transformPageChunk`](https://svelte.dev/docs/kit/hooks#Server-hooks-handle) option of `resolve` returned HTML with fewer comments than it received. If you're minifying the HTML, configure the minifier to keep comments (server-side includes such as `<!--#include ... -->` are ignored by this check). This is only checked during development.

## streaming_without_csr

> Returning promises from server `load` functions will only work if `csr === true`

[Streamed](https://svelte.dev/docs/kit/load#Streaming-with-promises) promises are sent to the browser after the page and resolved by SvelteKit's client-side code. With [`csr = false`](https://svelte.dev/docs/kit/page-options#csr) there's no client-side code, so they never resolve. Await the promises in `load` instead, or enable `csr`. This is only checked during development.
