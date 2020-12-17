import { find_anchor, get_base_uri } from '../utils';

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

			const selected = this.select(url);
			if (selected) {
				const noscroll = a.hasAttribute('sapper:noscroll');
				this.history.pushState({ id: this.cid }, '', url.href);
				this.navigate(selected, null, noscroll, url.hash);
				event.preventDefault();
			}
		});

		addEventListener('popstate', (event) => {
			this.scroll_history[this.cid] = scroll_state();

			if (event.state) {
				const url = new URL(location.href);
				const selected = this.select(url);
				if (selected) {
					this.navigate(selected, event.state.id);
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

		const selected = this.select(new URL(location.href));
		if (selected) return this.renderer.start(selected);
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
				const params = route.params(match);

				const page = { host: this.host, path, query, params };

				return { href: url.href, route, match, page };
			}
		}
	}

	async goto(href, { noscroll = false, replaceState = false } = {}) {
		const url = new URL(href, get_base_uri(document));
		const selected = this.select(url);

		if (selected) {
			history[replaceState ? 'replaceState' : 'pushState']({ id: this.cid }, '', href);

			// TODO shouldn't need to pass the hash here
			return this.navigate(selected, null, noscroll, url.hash);
		}

		location.href = href;

		return new Promise(() => {
			/* never resolves */
		});
	}

	async navigate(selected, id, noscroll, hash) {
		// remove trailing slashes
		if (location.pathname.endsWith('/') && location.pathname !== '/') {
			history.replaceState(
				{ id: this.cid },
				'',
				`${location.pathname.slice(0, -1)}${location.search}`
			);
		}

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

		await this.renderer.render(selected);

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
