## goto_options_removed

> The `goto(..., { noScroll: true, keepFocus: true })` options have been replaced by `reset: false`

[`goto`](https://svelte.dev/docs/kit/$app-navigation#goto) no longer accepts separate `noScroll` and `keepFocus` options. Pass `reset: false` instead, which preserves both the scroll position and the focused element:

```js
import { goto } from '$app/navigation';

await goto('/somewhere', { reset: false });
```

## navigation_before_start

> Cannot call %caller%(...) before router is initialized

Shallow routing functions such as [`pushState`](https://svelte.dev/docs/kit/$app-navigation#pushState), [`replaceState`](https://svelte.dev/docs/kit/$app-navigation#replaceState) and `goto(url, { shallow: true })` update the router's history state, which only exists once the app has started in the browser. Call them from event handlers, effects or `onMount` rather than while modules or components are first being evaluated.

## navigation_external_url

> Cannot use `%caller%` with an external URL. Use `window.location = "%url%"` instead

[`goto`](https://svelte.dev/docs/kit/$app-navigation#goto) and the [shallow routing](https://svelte.dev/docs/kit/shallow-routing) functions navigate within your app using SvelteKit's client-side router, so they can't go to a different origin. To leave the app, perform a full-page navigation by assigning to `window.location` or rendering a regular link.

## navigation_route_missing

> Cannot use `%caller%` with a URL that does not resolve to a route within the app. Use `window.location = "%url%"` instead

[`goto`](https://svelte.dev/docs/kit/$app-navigation#goto) and the [shallow routing](https://svelte.dev/docs/kit/shallow-routing) functions only navigate to pages of your app. The URL is on the same origin, but no route matches it — check it for typos, and remember that routes without a `+page` (for example, those with only a `+server.js`) can't be navigated to client-side. If the URL is served by something other than SvelteKit, navigate to it with `window.location` instead.

## redirect_loop

> Redirect loop while navigating to %url%

A navigation followed more than 20 redirects without reaching a page, which usually means two or more `load` functions redirect to each other, or a `load` function redirects to its own route. Check the conditions under which each [`redirect`](https://svelte.dev/docs/kit/@sveltejs-kit#redirect) is thrown, and make sure the destination doesn't redirect back.

## reserved_query_parameter

> Cannot use reserved query parameter "%key%"

SvelteKit uses query parameters starting with `x-sveltekit-` internally when it requests the data for a page, so a URL can't contain them. Rename the parameter.

## scroll_handling_outside_navigation

> Can only disable scroll handling during navigation

[`disableScrollHandling`](https://svelte.dev/docs/kit/$app-navigation#disableScrollHandling) stops SvelteKit from updating the scroll position after the current navigation. It only has an effect while the page is being updated following a navigation — for example in `onMount`, [`afterNavigate`](https://svelte.dev/docs/kit/$app-navigation#afterNavigate) or an action — so calling it at any other time is a mistake.
