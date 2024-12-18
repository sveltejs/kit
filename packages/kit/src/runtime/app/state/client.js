import {
	page as _page,
	navigating as _navigating,
	updated as _updated
} from '../../client/state.svelte.js';
import { stores } from '../../client/client.js';

/**
 * A reactive object with information about the current page, serving several use cases:
 * - retrieving the combined `data` of all pages/layouts anywhere in your component tree (also see [loading data](https://svelte.dev/docs/kit/load))
 * - retrieving the current value of the `form` prop anywhere in your component tree (also see [form actions](https://svelte.dev/docs/kit/form-actions))
 * - retrieving the page state that was set through `goto`, `pushState` or `replaceState` (also see [goto](https://svelte.dev/docs/kit/$app-navigation#goto) and [shallow routing](https://svelte.dev/docs/kit/shallow-routing))
 * - retrieving metadata such as the URL you're on, the current route and its parameters, and whether or not there was an error
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
 * On the server, values can only be read during rendering (in other words _not_ in e.g. `load` functions). In the browser, the values can be read at any time.
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
 * An object representing an in-progress navigation, with `from`, `to`, `type` and (if `type === 'popstate'`) `delta` properties.
 * Values are `null` when no navigation is occurring, or during server rendering.
 * @type {import('@sveltejs/kit').Navigation | { from: null, to: null, type: null, willUnload: null, delta: null, complete: null }}
 */
// @ts-expect-error
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
	get delta() {
		return _navigating.current ? _navigating.current.delta : null;
	},
	get complete() {
		return _navigating.current ? _navigating.current.complete : null;
	}
};

Object.defineProperty(navigating, 'current', {
	get() {
		// between 2.12.0 and 2.12.1 `navigating.current` existed
		throw new Error('Replace navigating.current.<prop> with navigating.<prop>');
	}
});

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
