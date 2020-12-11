import { find_anchor } from '../utils';

function which(event) {
	return event.which === null ? event.button : event.which;
}

function scroll_state() {
	return {
		x: pageXOffset,
		y: pageYOffset
	};
}

export class Router {
	constructor({ base, host, pages, ignore }) {
		this.base = base;
		this.host = host;
		this.pages = pages;
		this.ignore = ignore;

		this.uid = 1;
		this.cid = null;
		this.scroll_history = {};

		this.history = window.history || {
			pushState: () => {},
			replaceState: () => {},
			scrollRestoration: 'auto'
		};
	}

	init({ renderer }) {
		this.renderer = renderer;
		renderer.router = this;

		if ('scrollRestoration' in this.history) {
			this.history.scrollRestoration = 'manual';
		}

		// Adopted from Nuxt.js
		// Reset scrollRestoration to auto when leaving page, allowing page reload
		// and back-navigation from other pages to use the browser to restore the
		// scrolling position.
		addEventListener('beforeunload', () => {
			this.history.scrollRestoration = 'auto';
		});

		// Setting scrollRestoration to manual again when returning to this page.
		addEventListener('load', () => {
			this.history.scrollRestoration = 'manual';
		});

		addEventListener('click', (event) => {
			// Adapted from https://github.com/visionmedia/page.js
			// MIT license https://github.com/visionmedia/page.js#license
			if (which(event) !== 1) return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
			if (event.defaultPrevented) return;

			const a = find_anchor(event.target);
			if (!a) return;

			if (!a.href) return;

			// check if link is inside an svg
			// in this case, both href and target are always inside an object
			const svg = typeof a.href === 'object' && a.href.constructor.name === 'SVGAnimatedString';
			const href = String(svg ? a.href.baseVal : a.href);

			if (href === location.href) {
				if (!location.hash) event.preventDefault();
				return;
			}

			// Ignore if tag has
			// 1. 'download' attribute
			// 2. rel='external' attribute
			if (a.hasAttribute('download') || a.getAttribute('rel') === 'external') return;

			// Ignore if <a> has a target
			if (svg ? a.target.baseVal : a.target) return;

			const url = new URL(href);

			// Don't handle hash changes
			if (url.pathname === location.pathname && url.search === location.search) return;

			const page = this.select(url);
			if (page) {
				const noscroll = a.hasAttribute('sapper:noscroll');
				this.navigate(page, null, noscroll, url.hash);
				event.preventDefault();
				this.history.pushState({ id: this.cid }, '', url.href);
			}
		});

		addEventListener('popstate', (event) => {
			this.scroll_history[this.cid] = scroll_state();

			if (event.state) {
				const url = new URL(location.href);
				const page = this.select(url);
				if (page) {
					this.navigate(page, event.state.id);
				} else {
					// eslint-disable-next-line
					location.href = location.href; // nosonar
				}
			} else {
				// hashchange
				this.uid += 1;
				this.cid = this.uid;
				this.history.replaceState({ id: this.cid }, '', location.href);
			}
		});

		// load current page
		this.history.replaceState({ id: this.uid }, '', location.href);
		this.scroll_history[this.uid] = scroll_state();

		const page = this.select(new URL(location.href));
		// if (page) return this.navigate(page, this.uid, true, hash);
		if (page) return this.renderer.start(page);
	}

	select(url) {
		if (url.origin !== location.origin) return null;
		if (!url.pathname.startsWith(this.base)) return null;

		let path = url.pathname.slice(this.base.length);

		if (path === '') {
			path = '/';
		}

		// avoid accidental clashes between server routes and page routes
		if (this.ignore.some((pattern) => pattern.test(path))) return;

		for (const route of this.pages) {
			const match = route.pattern.exec(path);

			if (match) {
				const query = new URLSearchParams(url.search);
				const part = route.parts[route.parts.length - 1];
				const params = part.params ? part.params(match) : {};

				const page = { host: this.host, path, query, params };

				return { href: url.href, route, match, page };
			}
		}
	}

	async navigate(page, id, noscroll, hash) {
		const popstate = !!id;
		if (popstate) {
			this.cid = id;
		} else {
			const current_scroll = scroll_state();

			// clicked on a link. preserve scroll state
			this.scroll_history[this.cid] = current_scroll;

			this.cid = id = ++this.uid;
			this.scroll_history[this.cid] = noscroll ? current_scroll : { x: 0, y: 0 };
		}

		await this.renderer.render(page);

		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}

		if (!noscroll) {
			let scroll = this.scroll_history[id];

			let deep_linked;
			if (hash) {
				// scroll is an element id (from a hash), we need to compute y.
				deep_linked = document.getElementById(hash.slice(1));

				if (deep_linked) {
					scroll = {
						x: 0,
						y: deep_linked.getBoundingClientRect().top + scrollY
					};
				}
			}

			this.scroll_history[this.cid] = scroll;
			if (popstate || deep_linked) {
				scrollTo(scroll.x, scroll.y);
			} else {
				scrollTo(0, 0);
			}
		}
	}
}
