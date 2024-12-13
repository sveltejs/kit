import {
	page as _page,
	navigating as _navigating,
	updated as _updated
} from '../../client/state.svelte.js';
import { stores } from '../../client/client.js';

/**
 * An object with reactive property which contain page data. It serves various use cases:
 * - retrieve the combined `data` of all pages/layouts anywhere in your component tree (also see [loading data](https://svelte.dev/docs/kit/load))
 * - retrieve the current value of the `form` prop anywhere in your component tree (also see [form actions](https://svelte.dev/docs/kit/form-actions))
 * - retrieve the page state that was set through `goto`, `pushState` or `replaceState` (also see [goto](https://svelte.dev/docs/kit/$app-navigation#goto) and [shallow routing](https://svelte.dev/docs/kit/shallow-routing))
 * - retrieve metadata about the current page, such as the URL you're on, its parameters and route info, and whether or not there was an error
 *
 * ```svelte
 * <!--- +layout.svelte --->
 * <script>
 * 	import { page } from '$app/state';
 * </script>
 *
 * <p>Currently at {page.url.pathname}</p>
 *
 * {#if page.error}
 * 	<span class="red">Problem detected</span>
 * {:else}
 * 	<span class="small">All systems operational</span>
 * {/if}
 * ```
 *
 * On the server, the values can only be retrieved to during component initialization. In the browser, the values can be retrieved at any time.
 *
 * @type {import('@sveltejs/kit').Page}
 */
export const page = {
	get data() {
		return _page.data;
	},
	get error() {
		return _page.error;
	},
	get form() {
		return _page.form;
	},
	get params() {
		return _page.params;
	},
	get route() {
		return _page.route;
	},
	get state() {
		return _page.state;
	},
	get status() {
		return _page.status;
	},
	get url() {
		return _page.url;
	}
};

/**
 * An object with a reative `current` property.
 * When navigating starts, `current` is a `Navigation` object with `from`, `to`, `type` and (if `type === 'popstate'`) `delta` properties.
 * When navigating finishes, `current` reverts to `null`.
 *
 * On the server, this value can only be retrieved during component initialization. In the browser, it can be retrieved at any time.
 * @type {{ get current(): import('@sveltejs/kit').Navigation | null; }}
 */
export const navigating = {
	get current() {
		return _navigating.current;
	}
};

/**
 * A reactive value that's initially `false`. If [`version.pollInterval`](https://svelte.dev/docs/kit/configuration#version) is a non-zero value, SvelteKit will poll for new versions of the app and update `current` to `true` when it detects one. `updated.check()` will force an immediate check, regardless of polling.
 * @type {{ get current(): boolean; check(): Promise<boolean>; }}
 */
export const updated = {
	get current() {
		return _updated.current;
	},
	check: stores.updated.check
};
