import { DEV } from 'esm-env';
import * as svelte from 'svelte';
import { base } from '$app/paths';
// the variables _should_ be safe to statically import since they are set before
// this module is dynamically imported
import {
	after_navigate_callbacks,
	app,
	container,
	get_current,
	get_navigation_intent,
	load_route,
	set_root
} from './client.js';
import { PRELOAD_PRIORITIES } from './constants.js';
import { page, update } from './state.svelte.js';
import {
	clone_page,
	find_anchor,
	get_link_info,
	get_page_key,
	get_router_options
} from './utils.js';

/**
 * A set of tokens which are associated to current preloads.
 * If a preload becomes a real navigation, it's removed from the set.
 * If a preload token is in the set and the preload errors, the error
 * handling logic (for example reloading) is skipped.
 */
export const preload_tokens = new Set();

/** @typedef {(typeof PRELOAD_PRIORITIES)['hover'] | (typeof PRELOAD_PRIORITIES)['tap']} PreloadDataPriority */

export function setup() {
	/** @type {NodeJS.Timeout} */
	let mousemove_timeout;
	/** @type {Element} */
	let current_a;
	/** @type {PreloadDataPriority} */
	let current_priority;

	container.addEventListener('mousemove', (event) => {
		const target = /** @type {Element} */ (event.target);

		clearTimeout(mousemove_timeout);
		mousemove_timeout = setTimeout(() => {
			void preload(target, PRELOAD_PRIORITIES.hover);
		}, 20);
	});

	/** @param {Event} event */
	function tap(event) {
		if (event.defaultPrevented) return;
		void preload(/** @type {Element} */ (event.composedPath()[0]), PRELOAD_PRIORITIES.tap);
	}

	container.addEventListener('mousedown', tap);
	container.addEventListener('touchstart', tap, { passive: true });

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					void _preload_code(new URL(/** @type {HTMLAnchorElement} */ (entry.target).href));
					observer.unobserve(entry.target);
				}
			}
		},
		{ threshold: 0 }
	);

	/**
	 * @param {Element} element
	 * @param {PreloadDataPriority} priority
	 */
	async function preload(element, priority) {
		const a = find_anchor(element, container);

		// we don't want to preload data again if the user has already hovered/tapped
		const interacted = a === current_a && priority >= current_priority;
		if (!a || interacted) return;

		const { url, external, download } = get_link_info(a, base, app.hash);
		if (external || download) return;

		const options = get_router_options(a);

		// we don't want to preload data for a page we're already on
		const same_url = url && get_page_key(get_current().url, app) === get_page_key(url, app);
		if (options.reload || same_url) return;

		if (priority <= options.preload_data) {
			current_a = a;
			// we don't want to preload data again on tap if we've already preloaded it on hover
			current_priority = PRELOAD_PRIORITIES.tap;

			const intent = await get_navigation_intent(url, false);
			if (!intent) return;

			if (DEV) {
				void _preload_data(intent).then((result) => {
					if (result.type === 'loaded' && result.state.error) {
						console.warn(
							`Preloading data for ${intent.url.pathname} failed with the following error: ${result.state.error.message}\n` +
								'If this error is transient, you can ignore it. Otherwise, consider disabling preloading for this route. ' +
								'This route was preloaded due to a data-sveltekit-preload-data attribute. ' +
								'See https://svelte.dev/docs/kit/link-options for more info'
						);
					}
				});
			} else {
				void _preload_data(intent);
			}
		} else if (priority <= options.preload_code) {
			current_a = a;
			current_priority = priority;
			void _preload_code(/** @type {URL} */ (url));
		}
	}

	function after_navigate() {
		observer.disconnect();

		for (const a of container.querySelectorAll('a')) {
			const { url, external, download } = get_link_info(a, base, app.hash);
			if (external || download) continue;

			const options = get_router_options(a);
			if (options.reload) continue;

			if (options.preload_code === PRELOAD_PRIORITIES.viewport) {
				observer.observe(a);
			}

			if (options.preload_code === PRELOAD_PRIORITIES.eager) {
				void _preload_code(/** @type {URL} */ (url));
			}
		}
	}

	after_navigate_callbacks.add(after_navigate);
	after_navigate();
}

/** @type {{id: string, token: {}, promise: Promise<import('./types.js').NavigationResult>, fork: Promise<import('svelte').Fork | null> | null} | null} */
export let load_cache = null;

export function discard_load_cache() {
	void load_cache?.fork?.then((f) => f?.discard());
	load_cache = null;
}

/** @param {import('./types.js').NavigationIntent} intent */
export async function _preload_data(intent) {
	// Reuse the existing pending preload if it's for the same navigation.
	// Prevents an edge case where same preload is triggered multiple times,
	// then a later one is becoming the real navigation and the preload tokens
	// get out of sync.
	if (intent.id !== load_cache?.id) {
		discard_load_cache();

		const preload_token = {};
		preload_tokens.add(preload_token);
		load_cache = {
			id: intent.id,
			token: preload_token,
			promise: load_route({ ...intent, preload_token }).then((result) => {
				preload_tokens.delete(preload_token);
				if (result.type === 'loaded' && result.state.error) {
					// Don't cache errors, because they might be transient
					discard_load_cache();
				}
				return result;
			}),
			fork: null
		};

		if (svelte.fork) {
			const lc = load_cache;

			lc.fork = lc.promise.then((result) => {
				// if load_cache was discarded before load_cache.promise could
				// resolve, bail rather than creating an orphan fork
				if (lc === load_cache && result.type === 'loaded') {
					try {
						return svelte.fork(() => {
							set_root(result.props);
							update(result.props.page);
						});
					} catch {
						// if it errors, it's because the experimental flag isn't enabled
					}
				}

				return null;
			});
		}
	}

	return load_cache.promise;
}

/**
 * @param {URL} url
 * @returns {Promise<void>}
 */
export async function _preload_code(url) {
	const route = (await get_navigation_intent(url, false))?.route;

	if (route) {
		await Promise.all([...route.layouts, route.leaf].map((load) => load?.[1]()));
	}
}

/**
 * @param {Omit<import('./types.js').NavigationFinished['state'], 'branch'> & { error: App.Error }} opts
 * @returns {import('./types.js').NavigationFinished}
 */
export function preload_error({ error, url, route, params }) {
	return {
		type: 'loaded',
		state: {
			error,
			url,
			route,
			params,
			branch: []
		},
		props: {
			page: clone_page(page),
			constructors: []
		}
	};
}
