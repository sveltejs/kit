import {
	cid,
	history,
	initial_data,
	navigate,
	scroll_history,
	scroll_state,
	select_target,
	handle_error,
	set_target,
	uid,
	set_uid,
	set_cid
} from '../app';
import prefetch from '../prefetch/index';

export default function start(opts: {
	target: Node
}): Promise<void> {
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

	set_target(opts.target);

	addEventListener('click', handle_click);
	addEventListener('popstate', handle_popstate);

	// prefetch
	addEventListener('touchstart', trigger_prefetch);
	addEventListener('mousemove', handle_mousemove);

	return Promise.resolve().then(() => {
		const { hash, href } = location;

		history.replaceState({ id: uid }, '', href);

		const url = new URL(location.href);

		if (initial_data.error) return handle_error(url);

		const target = select_target(url);
		if (target) return navigate(target, uid, true, hash);
	});
}

let mousemove_timeout: NodeJS.Timer;

function handle_mousemove(event: MouseEvent) {
	clearTimeout(mousemove_timeout);
	mousemove_timeout = setTimeout(() => {
		trigger_prefetch(event);
	}, 20);
}

function trigger_prefetch(event: MouseEvent | TouchEvent) {
	const a: HTMLAnchorElement = <HTMLAnchorElement>find_anchor(<Node>event.target);
	if (!a || a.rel !== 'prefetch') return;

	prefetch(a.href);
}

function handle_click(event: MouseEvent) {
	// Adapted from https://github.com/visionmedia/page.js
	// MIT license https://github.com/visionmedia/page.js#license
	if (which(event) !== 1) return;
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
	if (event.defaultPrevented) return;

	const a: HTMLAnchorElement | SVGAElement = <HTMLAnchorElement | SVGAElement>find_anchor(<Node>event.target);
	if (!a) return;

	if (!a.href) return;

	// check if link is inside an svg
	// in this case, both href and target are always inside an object
	const svg = typeof a.href === 'object' && a.href.constructor.name === 'SVGAnimatedString';
	const href = String(svg ? (<SVGAElement>a).href.baseVal : a.href);

	if (href === location.href) {
		if (!location.hash) event.preventDefault();
		return;
	}

	// Ignore if tag has
	// 1. 'download' attribute
	// 2. rel='external' attribute
	if (a.hasAttribute('download') || a.getAttribute('rel') === 'external') return;

	// Ignore if <a> has a target
	if (svg ? (<SVGAElement>a).target.baseVal : a.target) return;

	const url = new URL(href);

	// Don't handle hash changes
	if (url.pathname === location.pathname && url.search === location.search) return;

	const target = select_target(url);
	if (target) {
		const noscroll = a.hasAttribute('svelte:noscroll');
		navigate(target, null, noscroll, url.hash);
		event.preventDefault();
		history.pushState({ id: cid }, '', url.href);
	}
}

function which(event: MouseEvent) {
	return event.which === null ? event.button : event.which;
}

function find_anchor(node: Node) {
	while (node && node.nodeName.toUpperCase() !== 'A') node = node.parentNode; // SVG <a> elements have a lowercase name
	return node;
}

function handle_popstate(event: PopStateEvent) {
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
		history.replaceState({ id: cid }, '', location.href);
	}
}
