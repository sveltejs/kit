import { get_base_uri } from './utils';

function scroll_state() {
	return {
		x: pageXOffset,
		y: pageYOffset
	};
}

/**
 * @param {Node} node
 * @returns {HTMLAnchorElement | SVGAElement}
 */
function find_anchor(node) {
	while (node && node.nodeName.toUpperCase() !== 'A') node = node.parentNode; // SVG <a> elements have a lowercase name
	return /** @type {HTMLAnchorElement | SVGAElement} */ (node);
}

export class Router {
	/** @param {{
	 *    base: string;
	 *    routes: import('types/internal').CSRRoute[];
	 * }} opts */
	constructor({ base, routes }) {
		this.base = base;
		this.routes = routes;
	}

	/** @param {import('./renderer').Renderer} renderer */
	init(renderer) {
		/** @type {import('./renderer').Renderer} */
		this.renderer = renderer;
		renderer.router = this;

		this.enabled = true;

		if ('scrollRestoration' in history) {
			history.scrollRestoration = 'manual';
		}

		// Adopted from Nuxt.js
		// Reset scrollRestoration to auto when leaving page, allowing page reload
		// and back-navigation from other pages to use the browser to restore the
		// scrolling position.
		addEventListener('beforeunload', () => {
			history.scrollRestoration = 'auto';
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
			}, 50);
		});

		/** @param {MouseEvent} event */
		const trigger_prefetch = (event) => {
			const a = find_anchor(/** @type {Node} */ (event.target));
			if (a && a.href && a.hasAttribute('sveltekit:prefetch')) {
				this.prefetch(new URL(/** @type {string} */ (a.href)));
			}
		};

		/** @type {NodeJS.Timeout} */
		let mousemove_timeout;

		/** @param {MouseEvent} event */
		const handle_mousemove = (event) => {
			clearTimeout(mousemove_timeout);
			mousemove_timeout = setTimeout(() => {
				trigger_prefetch(event);
			}, 20);
		};

		addEventListener('touchstart', trigger_prefetch);
		addEventListener('mousemove', handle_mousemove);

		/** @param {MouseEvent} event */
		addEventListener('click', (event) => {
			if (!this.enabled) return;

			// Adapted from https://github.com/visionmedia/page.js
			// MIT license https://github.com/visionmedia/page.js#license
			if (event.button || event.which !== 1) return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
			if (event.defaultPrevented) return;

			const a = find_anchor(/** @type {Node} */ (event.target));
			if (!a) return;

			if (!a.href) return;

			// check if link is inside an svg
			// in this case, both href and target are always inside an object
			const svg = typeof a.href === 'object' && a.href.constructor.name === 'SVGAnimatedString';
			const href = String(svg ? /** @type {SVGAElement} */ (a).href.baseVal : a.href);

			if (href === location.href) {
				if (!location.hash) event.preventDefault();
				return;
			}

			// Ignore if tag has
			// 1. 'download' attribute
			// 2. 'rel' attribute includes external
			const rel = a.getAttribute('rel')?.split(/\s+/);

			if (a.hasAttribute('download') || (rel && rel.includes('external'))) {
				return;
			}

			// Ignore if <a> has a target
			if (svg ? /** @type {SVGAElement} */ (a).target.baseVal : a.target) return;

			const url = new URL(href);

			// Don't handle hash changes
			if (url.pathname === location.pathname && url.search === location.search) return;

			const info = this.parse(url);
			if (info) {
				const noscroll = a.hasAttribute('sveltekit:noscroll');
				history.pushState({}, '', url.href);
				this._navigate(info, noscroll ? scroll_state() : null, [], url.hash);
				event.preventDefault();
			}
		});

		addEventListener('popstate', (event) => {
			if (event.state && this.enabled) {
				const url = new URL(location.href);
				const info = this.parse(url);
				if (info) {
					this._navigate(info, event.state['sveltekit:scroll'], []);
				} else {
					// eslint-disable-next-line
					location.href = location.href; // nosonar
				}
			}
		});

		// make it possible to reset focus
		document.body.setAttribute('tabindex', '-1');

		// create initial history entry, so we can return here
		history.replaceState(history.state || {}, '', location.href);
	}

	/**
	 * @param {URL} url
	 * @returns {import('./types').NavigationInfo}
	 */
	parse(url) {
		if (url.origin !== location.origin) return null;
		if (!url.pathname.startsWith(this.base)) return null;

		const path = url.pathname.slice(this.base.length) || '/';

		const routes = this.routes.filter(([pattern]) => pattern.test(path));

		if (routes.length > 0) {
			const query = new URLSearchParams(url.search);
			const id = `${path}?${query}`;

			return { id, routes, path, query };
		}
	}

	/**
	 * @param {string} href
	 * @param {{ noscroll?: boolean, replaceState?: boolean }} opts
	 * @param {string[]} chain
	 */
	async goto(href, { noscroll = false, replaceState = false } = {}, chain) {
		if (this.enabled) {
			const url = new URL(href, get_base_uri(document));
			const info = this.parse(url);

			if (info) {
				// TODO shouldn't need to pass the hash here
				history[replaceState ? 'replaceState' : 'pushState']({}, '', href);
				return this._navigate(info, noscroll ? scroll_state() : null, chain, url.hash);
			} else {
				// Tried to goto unknown path. Redirect to root page
				location.href = this.base + '/';
			}
		} else {
			location.href = href;
		}

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

		if (info) {
			return this.renderer.load(info);
		} else {
			throw new Error(`Could not prefetch ${url.href}`);
		}
	}

	/**
	 * @param {import('./types').NavigationInfo} info
	 * @param {{ x: number, y: number }} scroll
	 * @param {string[]} chain
	 * @param {string} [hash]
	 */
	async _navigate(info, scroll, chain, hash) {
		this.renderer.notify({
			path: info.path,
			query: info.query
		});

		// remove trailing slashes
		if (location.pathname.endsWith('/') && location.pathname !== '/') {
			history.replaceState({}, '', `${location.pathname.slice(0, -1)}${location.search}`);
		}

		await this.renderer.update(info, chain);

		document.body.focus();

		const deep_linked = hash && document.getElementById(hash.slice(1));
		if (scroll) {
			scrollTo(scroll.x, scroll.y);
		} else if (deep_linked) {
			// scroll is an element id (from a hash), we need to compute y
			scrollTo(0, deep_linked.getBoundingClientRect().top + scrollY);
		} else {
			scrollTo(0, 0);
		}
	}
}
