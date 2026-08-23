/** @import { Navigation } from '$app/navigation' */
/** @import { Page } from '$app/state' */
import { DEV } from 'esm-env';
import { untrack } from 'svelte';
import { assets } from '#app/paths';
import { version } from '$app/env';

/** @type {Page} */
export const internal_page = new (class Page {
	data = $state.raw({});
	form = $state.raw(null);
	error = $state.raw(null);
	params = $state.raw({});
	route = $state.raw({ id: null });
	shallow = $state.raw(null);
	state = $state.raw({});
	status = $state.raw(-1);
	url = $state.raw(new URL('a:'));
})();

/**
 * @param {Partial<Page>} new_page
 */
export function update_page(new_page) {
	Object.assign(internal_page, new_page);
}

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
		return internal_page.data;
	},
	get error() {
		return internal_page.error;
	},
	get form() {
		return internal_page.form;
	},
	get params() {
		return internal_page.params;
	},
	get route() {
		return internal_page.route;
	},
	get shallow() {
		return internal_page.shallow;
	},
	get state() {
		return internal_page.state;
	},
	get status() {
		return internal_page.status;
	},
	get url() {
		return internal_page.url;
	}
};

/** @type {Navigation | null} */
let navigation = $state.raw(null);

/**
 * @param {Navigation | null} value
 */
export function set_navigation(value) {
	navigation = value;
}

/**
 * A read-only object representing an in-progress navigation, with `from`, `to`, `type` and (if `type === 'popstate'`) `delta` properties.
 * Values are `null` when no navigation is occurring, or during server rendering.
 * @type {Navigation | { from: null, to: null, type: null, willUnload: null, delta: null, complete: null }}
 */
export const navigating = {
	get from() {
		return navigation ? navigation.from : null;
	},
	get to() {
		return navigation ? navigation.to : null;
	},
	get type() {
		return navigation ? navigation.type : null;
	},
	get willUnload() {
		return navigation ? navigation.willUnload : null;
	},
	// @ts-expect-error TODO not entirely sure what's going on here
	get delta() {
		return navigation?.type === 'popstate' ? navigation.delta : null;
	},
	get complete() {
		return navigation ? navigation.complete : null;
	}
};

const interval = __SVELTEKIT_APP_VERSION_POLL_INTERVAL__;

/** @type {number | undefined} */
let timeout;

/** @type {Promise<boolean> | undefined} */
let checking;

let _updated = $state(false);

/**
 * A read-only reactive value that's initially `false`. SvelteKit checks for new versions on data, remote, and form action responses (via the `x-sveltekit-version` header), when the tab regains focus or becomes visible, and on a poll interval (see [`version.pollInterval`](https://svelte.dev/docs/kit/configuration#version)). `updated.current` is set to `true` when a new version is detected. `updated.check()` will force an immediate check, regardless of polling.
 * @type {{ get current(): boolean; check(): Promise<boolean>; }}
 */
export const updated = {
	get current() {
		return _updated;
	},
	async check() {
		if (DEV) return false;

		window.clearTimeout(timeout);

		if (_updated) {
			return Promise.resolve(true);
		}

		return (checking ??= (async () => {
			try {
				const res = await fetch(`${assets}/${__SVELTEKIT_APP_VERSION_FILE__}`, {
					headers: {
						'cache-control': 'no-cache'
					}
				});

				if (!res.ok) {
					return false;
				}

				const data = await res.json();
				return untrack(() => (_updated ||= data.version !== version));
			} catch {
				return false;
			} finally {
				checking = undefined;
				if (interval && !_updated) timeout = window.setTimeout(updated.check, interval);
			}
		})());
	}
};

if (!DEV && interval) {
	timeout = window.setTimeout(updated.check, interval);
}

/**
 * Mark `updated.current` as `true` if the given version differs from the one
 * the app was hydrated with. Called from the server response header path.
 * Does NOT reset the poll timer — unlike `check()`, this is a passive observation
 * from a single server instance's response, not an explicit version check. The
 * poll timer continues on its original schedule as a backstop. This is important
 * for platforms that implement skew protection, where `x-sveltekit-version`
 * may be out of date — in this case we still need to poll for `version.json`.
 * @param {string | null} new_version
 */
export function notify_version(new_version) {
	if (__SVELTEKIT_APP_VERSION_CHECKS_ENABLED__ && new_version) {
		// untrack the write too — in an `$.save`-restored reaction window a tracked
		// write throws `state_unsafe_mutation`, which is not DEV-only
		untrack(() => (_updated ||= new_version !== version));
	}
}

/**
 * Used for testing
 */
export function reset_updated() {
	_updated = false;
}
