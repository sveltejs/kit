import { onMount } from 'svelte';
import { get_base_uri } from './utils';

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
	 *    routes: import('types/internal').CSRRoute[];
	 *    trailing_slash: import('types/internal').TrailingSlash;
	 *    renderer: import('./renderer').Renderer
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

		// make it possible to reset focus
		document.body.setAttribute('tabindex', '-1');

		// keeping track of the history index in order to prevent popstate navigation events if needed
		this.current_history_index = history.state?.['sveltekit:index'] ?? 0;

		if (this.current_history_index === 0) {
			// create initial history entry, so we can return here
			history.replaceState({ ...history.state, 'sveltekit:index': 0 }, '', location.href);
		}

		this.callbacks = {
			/** @type {Array<({ from, to, cancel }: { from: URL, to: URL | null, cancel: () => void }) => void>} */
			before_navigate: [],

			/** @type {Array<({ from, to }: { from: URL | null, to: URL }) => void>} */
			after_navigate: []
		};
	}

	init_listeners() {
		if ('scrollRestoration' in history) {
			history.scrollRestoration = 'manual';
		}

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

		// Setting scrollRestoration to manual again when returning to this page.
		addEventListener('load', () => {
			history.scrollRestoration = 'manual';
		});

		// There's no API to capture the scroll location right before the user
		// hits the back/forward button, so we listen for scroll events

		/** @type {NodeJS.Timeout} */
		let scroll_timer;
		addEventListener('scroll', () => {
			clearTimeout(scroll_timer);
			scroll_timer = setTimeout(() => {
				// Store the scroll location in the history
				// This will persist even if we navigate away from the site and come back
				const new_state = {
					...(history.state || {}),
					'sveltekit:scroll': scroll_state()
				};
				history.replaceState(new_state, document.title, window.location.href);
				// iOS scroll event intervals happen between 30-150ms, sometimes around 200ms
			}, 200);
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

			const url = get_href(a);
			const url_string = url.toString();
			if (url_string === location.href) {
				if (!location.hash) event.preventDefault();
				return;
			}

			// Ignore if tag has
			// 1. 'download' attribute
			// 2. 'rel' attribute includes external
			const rel = (a.getAttribute('rel') || '').split(/\s+/);

			if (a.hasAttribute('download') || (rel && rel.includes('external'))) {
				return;
			}

			// Ignore if <a> has a target
			if (a instanceof SVGAElement ? a.target.baseVal : a.target) return;

			// Check if new url only differs by hash and use the browser default behavior in that case
			// This will ensure the `hashchange` event is fired
			// Removing the hash does a full page navigation in the browser, so make sure a hash is present
			const [base, hash] = url.href.split('#');
			if (hash && base === location.href.split('#')[0]) {
				// Call `pushState` to add url to history so going back works.
				// Also make a delay, otherwise the browser default behaviour would not kick in
				setTimeout(() => history.pushState({}, '', url.href));
				const info = this.parse(url);
				if (info) {
					return this.renderer.update(info, [], false);
				}
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
					scroll: event.state['sveltekit:scroll'],
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
	 * @returns {Promise<import('./types').NavigationResult>}
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

		accepted();

		if (!this.navigating) {
			dispatchEvent(new CustomEvent('sveltekit:navigation-start'));
		}
		this.navigating++;

		let { pathname } = url;

		if (this.trailing_slash === 'never') {
			if (pathname !== '/' && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
		} else if (this.trailing_slash === 'always') {
			const is_file = /** @type {string} */ (url.pathname.split('/').pop()).includes('.');
			if (!is_file && !pathname.endsWith('/')) pathname += '/';
		}

		info.url = new URL(url.origin + pathname + url.search + url.hash);

		if (details) {
			const change = details.replaceState ? 0 : 1;
			details.state['sveltekit:index'] = this.current_history_index += change;
			history[details.replaceState ? 'replaceState' : 'pushState'](details.state, '', info.url);
		}

		await this.renderer.handle_navigation(info, chain, false, {
			scroll,
			keepfocus
		});

		this.navigating--;
		if (!this.navigating) {
			dispatchEvent(new CustomEvent('sveltekit:navigation-end'));

			const navigation = { from, to: url };
			this.callbacks.after_navigate.forEach((fn) => fn(navigation));
		}
	}
}
