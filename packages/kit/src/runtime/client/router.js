import { onMount } from 'svelte';
import { normalize_path } from '../../utils/url';
import { get_base_uri } from './utils';

// We track the scroll position associated with each history entry in sessionStorage,
// rather than on history.state itself, because when navigation is driven by
// popstate it's too late to update the scroll position associated with the
// state we're navigating from
const SCROLL_KEY = 'sveltekit:scroll';

/** @typedef {{ x: number, y: number }} ScrollPosition */
/** @type {Record<number, ScrollPosition>} */
let scroll_positions = {};
try {
	scroll_positions = JSON.parse(sessionStorage[SCROLL_KEY]);
} catch {
	// do nothing
}

/** @param {number} index */
function update_scroll_positions(index) {
	scroll_positions[index] = scroll_state();
}

function scroll_state() {
	return {
		x: pageXOffset,
		y: pageYOffset
	};
}

/**
 * @param {Event} event
 * @returns {HTMLAnchorElement | SVGAElement | undefined}
 */
function find_anchor(event) {
	const node = event
		.composedPath()
		.find((e) => e instanceof Node && e.nodeName.toUpperCase() === 'A'); // SVG <a> elements have a lowercase name
	return /** @type {HTMLAnchorElement | SVGAElement | undefined} */ (node);
}

/**
 * @param {HTMLAnchorElement | SVGAElement} node
 * @returns {URL}
 */
function get_href(node) {
	return node instanceof SVGAElement
		? new URL(node.href.baseVal, document.baseURI)
		: new URL(node.href);
}

export class Router {
	/**
	 * @param {{
	 *    base: string;
	 *    routes: import('types').CSRRoute[];
	 *    trailing_slash: import('types').TrailingSlash;
	 *    renderer: import('./renderer').Renderer;
	 * }} opts
	 */
	constructor({ base, routes, trailing_slash, renderer }) {
		this.base = base;
		this.routes = routes;
		this.trailing_slash = trailing_slash;
		/** Keeps tracks of multiple navigations caused by redirects during rendering */
		this.navigating = 0;

		/** @type {import('./renderer').Renderer} */
		this.renderer = renderer;
		renderer.router = this;

		this.enabled = true;
		this.initialized = false;

		// keeping track of the history index in order to prevent popstate navigation events if needed
		this.current_history_index = history.state?.['sveltekit:index'] ?? 0;

		if (this.current_history_index === 0) {
			// create initial history entry, so we can return here
			history.replaceState({ ...history.state, 'sveltekit:index': 0 }, '', location.href);
		}

		// if we reload the page, or Cmd-Shift-T back to it,
		// recover scroll position
		const scroll = scroll_positions[this.current_history_index];
		if (scroll) scrollTo(scroll.x, scroll.y);

		this.hash_navigating = false;

		this.callbacks = {
			/** @type {Array<({ from, to, cancel }: { from: URL, to: URL | null, cancel: () => void }) => void>} */
			before_navigate: [],

			/** @type {Array<({ from, to }: { from: URL | null, to: URL }) => void>} */
			after_navigate: []
		};
	}

	init_listeners() {
		history.scrollRestoration = 'manual';

		// Adopted from Nuxt.js
		// Reset scrollRestoration to auto when leaving page, allowing page reload
		// and back-navigation from other pages to use the browser to restore the
		// scrolling position.
		addEventListener('beforeunload', (e) => {
			let should_block = false;

			const intent = {
				from: this.renderer.current.url,
				to: null,
				cancel: () => (should_block = true)
			};

			this.callbacks.before_navigate.forEach((fn) => fn(intent));

			if (should_block) {
				e.preventDefault();
				e.returnValue = '';
			} else {
				history.scrollRestoration = 'auto';
			}
		});

		addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				update_scroll_positions(this.current_history_index);

				try {
					sessionStorage[SCROLL_KEY] = JSON.stringify(scroll_positions);
				} catch {
					// do nothing
				}
			}
		});

		/** @param {Event} event */
		const trigger_prefetch = (event) => {
			const a = find_anchor(event);
			if (a && a.href && a.hasAttribute('sveltekit:prefetch')) {
				this.prefetch(get_href(a));
			}
		};

		/** @type {NodeJS.Timeout} */
		let mousemove_timeout;

		/** @param {MouseEvent|TouchEvent} event */
		const handle_mousemove = (event) => {
			clearTimeout(mousemove_timeout);
			mousemove_timeout = setTimeout(() => {
				// event.composedPath(), which is used in find_anchor, will be empty if the event is read in a timeout
				// add a layer of indirection to address that
				event.target?.dispatchEvent(
					new CustomEvent('sveltekit:trigger_prefetch', { bubbles: true })
				);
			}, 20);
		};

		addEventListener('touchstart', trigger_prefetch);
		addEventListener('mousemove', handle_mousemove);
		addEventListener('sveltekit:trigger_prefetch', trigger_prefetch);

		/** @param {MouseEvent} event */
		addEventListener('click', (event) => {
			if (!this.enabled) return;

			// Adapted from https://github.com/visionmedia/page.js
			// MIT license https://github.com/visionmedia/page.js#license
			if (event.button || event.which !== 1) return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
			if (event.defaultPrevented) return;

			const a = find_anchor(event);
			if (!a) return;

			if (!a.href) return;

			const is_svg_a_element = a instanceof SVGAElement;
			const url = get_href(a);
			const url_string = url.toString();
			if (url_string === location.href) {
				if (!location.hash) event.preventDefault();
				return;
			}

			// Ignore if url does not have origin (e.g. `mailto:`, `tel:`.)
			// MEMO: Without this condition, firefox will open mailer twice.
			// See: https://github.com/sveltejs/kit/issues/4045
			if (!is_svg_a_element && url.origin === 'null') return;

			// Ignore if tag has
			// 1. 'download' attribute
			// 2. 'rel' attribute includes external
			const rel = (a.getAttribute('rel') || '').split(/\s+/);

			if (a.hasAttribute('download') || (rel && rel.includes('external'))) {
				return;
			}

			// Ignore if <a> has a target
			if (is_svg_a_element ? a.target.baseVal : a.target) return;

			// Check if new url only differs by hash and use the browser default behavior in that case
			// This will ensure the `hashchange` event is fired
			// Removing the hash does a full page navigation in the browser, so make sure a hash is present
			const [base, hash] = url.href.split('#');
			if (hash !== undefined && base === location.href.split('#')[0]) {
				// set this flag to distinguish between navigations triggered by
				// clicking a hash link and those triggered by popstate
				this.hash_navigating = true;

				update_scroll_positions(this.current_history_index);
				this.renderer.update_page_store(new URL(url.href));

				return;
			}

			this._navigate({
				url,
				scroll: a.hasAttribute('sveltekit:noscroll') ? scroll_state() : null,
				keepfocus: false,
				chain: [],
				details: {
					state: {},
					replaceState: false
				},
				accepted: () => event.preventDefault(),
				blocked: () => event.preventDefault()
			});
		});

		addEventListener('popstate', (event) => {
			if (event.state && this.enabled) {
				// if a popstate-driven navigation is cancelled, we need to counteract it
				// with history.go, which means we end up back here, hence this check
				if (event.state['sveltekit:index'] === this.current_history_index) return;

				this._navigate({
					url: new URL(location.href),
					scroll: scroll_positions[event.state['sveltekit:index']],
					keepfocus: false,
					chain: [],
					details: null,
					accepted: () => {
						this.current_history_index = event.state['sveltekit:index'];
					},
					blocked: () => {
						const delta = this.current_history_index - event.state['sveltekit:index'];
						history.go(delta);
					}
				});
			}
		});

		addEventListener('hashchange', () => {
			// if the hashchange happened as a result of clicking on a link,
			// we need to update history, otherwise we have to leave it alone
			if (this.hash_navigating) {
				this.hash_navigating = false;
				history.replaceState(
					{ ...history.state, 'sveltekit:index': ++this.current_history_index },
					'',
					location.href
				);
			}
		});

		this.initialized = true;
	}

	/**
	 * Returns true if `url` has the same origin and basepath as the app
	 * @param {URL} url
	 */
	owns(url) {
		return url.origin === location.origin && url.pathname.startsWith(this.base);
	}

	/**
	 * @param {URL} url
	 * @returns {import('./types').NavigationInfo | undefined}
	 */
	parse(url) {
		if (this.owns(url)) {
			const path = decodeURI(url.pathname.slice(this.base.length) || '/');

			return {
				id: url.pathname + url.search,
				routes: this.routes.filter(([pattern]) => pattern.test(path)),
				url,
				path
			};
		}
	}

	/**
	 * @typedef {Parameters<typeof import('$app/navigation').goto>} GotoParams
	 *
	 * @param {GotoParams[0]} href
	 * @param {GotoParams[1]} opts
	 * @param {string[]} chain
	 */
	async goto(
		href,
		{ noscroll = false, replaceState = false, keepfocus = false, state = {} } = {},
		chain
	) {
		const url = new URL(href, get_base_uri(document));

		if (this.enabled) {
			return this._navigate({
				url,
				scroll: noscroll ? scroll_state() : null,
				keepfocus,
				chain,
				details: {
					state,
					replaceState
				},
				accepted: () => {},
				blocked: () => {}
			});
		}

		location.href = url.href;
		return new Promise(() => {
			/* never resolves */
		});
	}

	enable() {
		this.enabled = true;
	}

	disable() {
		this.enabled = false;
	}

	/**
	 * @param {URL} url
	 * @returns {Promise<import('./types').NavigationResult | undefined>}
	 */
	async prefetch(url) {
		const info = this.parse(url);

		if (!info) {
			throw new Error('Attempted to prefetch a URL that does not belong to this app');
		}

		return this.renderer.load(info);
	}

	/** @param {({ from, to }: { from: URL | null, to: URL }) => void} fn */
	after_navigate(fn) {
		onMount(() => {
			this.callbacks.after_navigate.push(fn);

			return () => {
				const i = this.callbacks.after_navigate.indexOf(fn);
				this.callbacks.after_navigate.splice(i, 1);
			};
		});
	}

	/**
	 * @param {({ from, to, cancel }: { from: URL, to: URL | null, cancel: () => void }) => void} fn
	 */
	before_navigate(fn) {
		onMount(() => {
			this.callbacks.before_navigate.push(fn);

			return () => {
				const i = this.callbacks.before_navigate.indexOf(fn);
				this.callbacks.before_navigate.splice(i, 1);
			};
		});
	}

	/**
	 * @param {{
	 *   url: URL;
	 *   scroll: { x: number, y: number } | null;
	 *   keepfocus: boolean;
	 *   chain: string[];
	 *   details: {
	 *     replaceState: boolean;
	 *     state: any;
	 *   } | null;
	 *   accepted: () => void;
	 *   blocked: () => void;
	 * }} opts
	 */
	async _navigate({ url, scroll, keepfocus, chain, details, accepted, blocked }) {
		const from = this.renderer.current.url;
		let should_block = false;

		const intent = {
			from,
			to: url,
			cancel: () => (should_block = true)
		};

		this.callbacks.before_navigate.forEach((fn) => fn(intent));

		if (should_block) {
			blocked();
			return;
		}

		const info = this.parse(url);
		if (!info) {
			location.href = url.href;
			return new Promise(() => {
				// never resolves
			});
		}

		update_scroll_positions(this.current_history_index);

		accepted();

		this.navigating++;

		const pathname = normalize_path(url.pathname, this.trailing_slash);

		info.url = new URL(url.origin + pathname + url.search + url.hash);

		const token = (this.navigating_token = {});

		await this.renderer.handle_navigation(info, chain, false, {
			scroll,
			keepfocus
		});

		this.navigating--;

		// navigation was aborted
		if (this.navigating_token !== token) return;
		if (!this.navigating) {
			const navigation = { from, to: url };
			this.callbacks.after_navigate.forEach((fn) => fn(navigation));
		}

		if (details) {
			const change = details.replaceState ? 0 : 1;
			details.state['sveltekit:index'] = this.current_history_index += change;
			history[details.replaceState ? 'replaceState' : 'pushState'](details.state, '', info.url);
		}
	}
}
