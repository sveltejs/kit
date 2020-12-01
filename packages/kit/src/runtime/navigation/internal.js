import { find_anchor } from './utils';
import { ignore, routes } from 'MANIFEST';

export let uid = 1;
export function set_uid(n) {
	uid = n;
}

export let cid;
export function set_cid(n) {
	cid = n;
}

const _history =
	typeof history !== 'undefined'
		? history
		: {
			pushState: () => {},
			replaceState: () => {},
			scrollRestoration: 'auto'
		  };
export { _history as history };

export const scroll_history = {};

export async function load_current_page() {
	const { hash, href } = location;

	_history.replaceState({ id: uid }, '', href);

	const target = select_target(new URL(location.href));
	if (target) return navigate(target, uid, true, hash);
}

let base_url;
let handle_target;

export function init(base, handler) {
	base_url = base;
	handle_target = handler;

	if ('scrollRestoration' in _history) {
		_history.scrollRestoration = 'manual';
	}

	// Adopted from Nuxt.js
	// Reset scrollRestoration to auto when leaving page, allowing page reload
	// and back-navigation from other pages to use the browser to restore the
	// scrolling position.
	addEventListener('beforeunload', () => {
		_history.scrollRestoration = 'auto';
	});

	// Setting scrollRestoration to manual again when returning to this page.
	addEventListener('load', () => {
		_history.scrollRestoration = 'manual';
	});

	addEventListener('click', handle_click);
	addEventListener('popstate', handle_popstate);
}

export function select_target(url) {
	if (url.origin !== location.origin) return null;
	if (!url.pathname.startsWith(base_url)) return null;

	let path = url.pathname.slice(base_url.length);

	if (path === '') {
		path = '/';
	}

	// avoid accidental clashes between server routes and page routes
	if (ignore.some(pattern => pattern.test(path))) return;

	for (let i = 0; i < routes.length; i += 1) {
		const route = routes[i];

		const match = route.pattern.exec(path);

		if (match) {
			const query = new URLSearchParams(url.search);
			const part = route.parts[route.parts.length - 1];
			const params = part.params ? part.params(match) : {};

			const page = { host: location.host, path, query, params };

			return { href: url.href, route, match, page };
		}
	}
}

function handle_click(event) {
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
	if (svg ? (a).target.baseVal : a.target) return;

	const url = new URL(href);

	// Don't handle hash changes
	if (url.pathname === location.pathname && url.search === location.search) return;

	const target = select_target(url);
	if (target) {
		const noscroll = a.hasAttribute('sapper:noscroll');
		navigate(target, null, noscroll, url.hash);
		event.preventDefault();
		_history.pushState({ id: cid }, '', url.href);
	}
}

function which(event) {
	return event.which === null ? event.button : event.which;
}

function scroll_state() {
	return {
		x: pageXOffset,
		y: pageYOffset
	};
}

function handle_popstate(event) {
	scroll_history[cid] = scroll_state();

	if (event.state) {
		const url = new URL(location.href);
		const target = select_target(url);
		if (target) {
			navigate(target, event.state.id);
		} else {
			// eslint-disable-next-line
			location.href = location.href; // nosonar
		}
	} else {
		// hashchange
		set_uid(uid + 1);
		set_cid(uid);
		_history.replaceState({ id: cid }, '', location.href);
	}
}

export async function navigate(
	dest,
	id,
	noscroll,
	hash
) {
	const popstate = !!id;
	if (popstate) {
		cid = id;
	} else {
		const current_scroll = scroll_state();

		// clicked on a link. preserve scroll state
		scroll_history[cid] = current_scroll;

		cid = id = ++uid;
		scroll_history[cid] = noscroll ? current_scroll : { x: 0, y: 0 };
	}

	await handle_target(dest);
	if (document.activeElement && document.activeElement instanceof HTMLElement) {
		document.activeElement.blur();
	}

	if (!noscroll) {
		let scroll = scroll_history[id];

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

		scroll_history[cid] = scroll;
		if (popstate || deep_linked) {
			scrollTo(scroll.x, scroll.y);
		} else {
			scrollTo(0, 0);
		}
	}
}
