/** @import { Navigation } from '$app/navigation' */
/** @import { Page } from '$app/state' */
import {
	page as _page,
	navigating as _navigating,
	updated as _updated
} from '../../client/state.svelte.js';

/**
 * A read-only reactive object with information about the current page, serving several use cases:
 * - retrieving the combined `data` of all pages/layouts anywhere in your component tree (also see [loading data](https://svelte.dev/docs/kit/load))
 * - retrieving the current value of the `form` prop anywhere in your component tree (also see [form actions](https://svelte.dev/docs/kit/form-actions))
 * - retrieving the page state that was set through `goto` (also see [goto](https://svelte.dev/docs/kit/$app-navigation#goto) and [shallow routing](https://svelte.dev/docs/kit/shallow-routing))
 * - retrieving metadata such as the URL you're on, the current route and its parameters, the target of a shallow navigation, and whether or not there was an error
 *
 * ```svelte
 * <!--- file: +layout.svelte --->
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
 * Changes to `page` are available exclusively with runes. (The legacy reactivity syntax will not reflect any changes)
 *
 * ```svelte
 * <!--- file: +page.svelte --->
 * <script>
 * 	import { page } from '$app/state';
 * 	const id = $derived(page.params.id); // This will correctly update id for usage on this page
 * 	$: badId = page.params.id; // Do not use; will never update after initial load
 * </script>
 * ```
 *
 * On the server, values can only be read during rendering (in other words _not_ in e.g. `load` functions). In the browser, the values can be read at any time.
 *
 * @type {Page}
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
	get shallow() {
		return _page.shallow;
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
 * A read-only object representing an in-progress navigation, with `from`, `to`, `type` and (if `type === 'popstate'`) `delta` properties.
 * Values are `null` when no navigation is occurring, or during server rendering.
 * @type {Navigation | { from: null, to: null, type: null, willUnload: null, delta: null, complete: null }}
 */
export const navigating = {
	get from() {
		return _navigating.current ? _navigating.current.from : null;
	},
	get to() {
		return _navigating.current ? _navigating.current.to : null;
	},
	get type() {
		return _navigating.current ? _navigating.current.type : null;
	},
	get willUnload() {
		return _navigating.current ? _navigating.current.willUnload : null;
	},
	// @ts-expect-error TODO not entirely sure what's going on here
	get delta() {
		return _navigating.current?.type === 'popstate' ? _navigating.current.delta : null;
	},
	get complete() {
		return _navigating.current ? _navigating.current.complete : null;
	}
};

/**
 * A read-only reactive value that's initially `false`. SvelteKit checks for new versions on data, remote, and form action responses (via the `x-sveltekit-version` header), when the tab regains focus or becomes visible, and on a poll interval (see [`version.pollInterval`](https://svelte.dev/docs/kit/configuration#version)). `updated.current` is set to `true` when a new version is detected. `updated.check()` will force an immediate check, regardless of polling.
 * @type {{ get current(): boolean; check(): Promise<boolean>; }}
 */
export const updated = {
	get current() {
		return _updated.current;
	},
	check: _updated.check
};
