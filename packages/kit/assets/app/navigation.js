import { routes, layout, components, ErrorComponent } from '../generated/manifest.js';
import { writable } from 'svelte/store';
import root from '../generated/root.svelte';

function get_base_uri(window_document) {
	let baseURI = window_document.baseURI;

	if (!baseURI) {
		const baseTags = window_document.getElementsByTagName('base');
		baseURI = baseTags.length ? baseTags[0].href : window_document.URL;
	}

	return baseURI;
}

function find_anchor(node) {
	while (node && node.nodeName.toUpperCase() !== 'A') node = node.parentNode; // SVG <a> elements have a lowercase name
	return node;
}

let uid = 1;
function set_uid(n) {
	uid = n;
}

let cid;
function set_cid(n) {
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

const scroll_history = {};

async function load_current_page() {
	const { hash, href } = location;

	_history.replaceState({ id: uid }, '', href);

	const target = select_target(new URL(location.href));
	if (target) return navigate(target, uid, true, hash);
}

let base_url;
let handle_target;

function init(base, handler) {
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

function select_target(url) {
	if (url.origin !== location.origin) return null;
	if (!url.pathname.startsWith(base_url)) return null;

	let path = url.pathname.slice(base_url.length);

	if (path === '') {
		path = '/';
	}

	// avoid accidental clashes between server routes and page routes
	// if (ignore.some(pattern => pattern.test(path))) return;

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

async function navigate(
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

function goto(
	href,
	opts = { noscroll: false, replaceState: false }
) {
	const target = select_target(new URL(href, get_base_uri(document)));

	if (target) {
		_history[opts.replaceState ? 'replaceState' : 'pushState']({ id: cid }, '', href);
		return navigate(target, null, opts.noscroll);
	}

	location.href = href;
	return new Promise(() => {
		/* never resolves */
	});
}

/** Callback to inform of a value updates. */
function page_store(value) {
	const store = writable(value);
	let ready = true;

	function notify() {
		ready = true;
		store.update((val) => val);
	}

	function set(new_value) {
		ready = false;
		store.set(new_value);
	}

	function subscribe(run) {
		let old_value;
		return store.subscribe((new_value) => {
			if (old_value === undefined || (ready && new_value !== old_value)) {
				run((old_value = new_value));
			}
		});
	}

	return { notify, set, subscribe };
}

let ready = false;
let root_component;
let current_token;
let initial_preloaded_data;
let root_preloaded;
let current_branch = [];
let current_query = '{}';

const stores = {
	page: page_store({}),
	preloading: writable(false),
	session: writable(null)
};

let $session;
let session_dirty;

stores.session.subscribe(async (value) => {
	$session = value;

	if (!ready) return;
	session_dirty = true;

	const dest = select_target(new URL(location.href));

	const token = (current_token = {});
	const { redirect, props, branch } = await hydrate_target(dest);
	if (token !== current_token) return; // a secondary navigation happened while we were loading

	if (redirect) {
		await goto(redirect.location, { replaceState: true });
	} else {
		await render(branch, props, buildPageContext(props, dest.page));
	}
});

let target;
function set_target(node) {
	target = node;
}

async function start(opts) {
	set_target(opts.target);

	init(opts.baseUrl, handle_target$1);

	start$1();

	initial_preloaded_data = opts.preloaded;
	root_preloaded = initial_preloaded_data[0];

	stores.session.set(opts.session);

	if (opts.error) {
		return handle_error(opts);
	}

	return load_current_page();
}

function handle_error({ session, preloaded, status, error }) {
	const { host, pathname, search } = location;

	const props = {
		error,
		status,
		session,
		level0: {
			props: root_preloaded
		},
		level1: {
			props: {
				status,
				error
			},
			component: ErrorComponent
		},
		segments: preloaded
	};
	const query = new URLSearchParams(search);
	render([], props, { host, path: pathname, query, params: {}, error });
}

function buildPageContext(props, page) {
	const { error } = props;

	return { error, ...page };
}

async function handle_target$1(dest) {
	if (root_component) stores.preloading.set(true);

	const hydrating = get_prefetched(dest);

	const token = (current_token = {});
	const hydrated_target = await hydrating;
	const { redirect } = hydrated_target;
	if (token !== current_token) return; // a secondary navigation happened while we were loading

	if (redirect) {
		await goto(redirect.location, { replaceState: true });
	} else {
		const { props, branch } = hydrated_target;
		await render(branch, props, buildPageContext(props, dest.page));
	}
}

async function render(branch, props, page) {
	stores.page.set(page);
	stores.preloading.set(false);

	if (root_component) {
		root_component.$set(props);
	} else {
		props.stores = {
			page: { subscribe: stores.page.subscribe },
			preloading: { subscribe: stores.preloading.subscribe },
			session: stores.session
		};
		props.level0 = {
			props: await root_preloaded
		};
		props.notify = stores.page.notify;

		root_component = new root({
			target,
			props,
			hydrate: true
		});
	}

	current_branch = branch;
	current_query = JSON.stringify(page.query); // TODO this is no good — URLSearchParams can't be serialized like that
	ready = true;
	session_dirty = false;
}

function part_changed(i, segment, match, stringified_query) {
	// TODO only check query string changes for preload functions
	// that do in fact depend on it (using static analysis or
	// runtime instrumentation)
	if (stringified_query !== current_query) return true;

	const previous = current_branch[i];

	if (!previous) return false;
	if (segment !== previous.segment) return true;
	if (previous.match) {
		if (JSON.stringify(previous.match.slice(1, i + 2)) !== JSON.stringify(match.slice(1, i + 2))) {
			return true;
		}
	}
}

async function hydrate_target(dest) {
	const { route, page } = dest;
	const segments = page.path.split('/').filter(Boolean);

	let redirect = null;

	const props = { error: null, status: 200, segments: [segments[0]] };

	const preload_context = {
		fetch: (url, opts) => fetch(url, opts),
		redirect: (statusCode, location) => {
			if (redirect && (redirect.statusCode !== statusCode || redirect.location !== location)) {
				throw new Error('Conflicting redirects');
			}
			redirect = { statusCode, location };
		},
		error: (status, error) => {
			props.error = typeof error === 'string' ? new Error(error) : error;
			props.status = status;
		}
	};

	if (!root_preloaded) {
		root_preloaded =
			(layout.preload
				? layout.preload.call(
						preload_context,
						{
							host: page.host,
							path: page.path,
							query: page.query,
							params: {}
						},
						$session
				  )
				: {});
	}

	let branch;
	let l = 1;

	try {
		const stringified_query = JSON.stringify(page.query);
		const match = route.pattern.exec(page.path);

		let segment_dirty = false;

		branch = await Promise.all(
			route.parts.map(async (part, i) => {
				const segment = segments[i];

				if (part_changed(i, segment, match, stringified_query)) segment_dirty = true;

				props.segments[l] = segments[i + 1]; // TODO make this less confusing
				if (!part) return { segment };

				const j = l++;

				if (
					!session_dirty &&
					!segment_dirty &&
					current_branch[i] &&
					current_branch[i].part === part.i
				) {
					return current_branch[i];
				}

				segment_dirty = false;

				const { default: component, preload } = await components[part.i]();

				let preloaded;
				if (ready || !initial_preloaded_data[i + 1]) {
					preloaded = preload
						? await preload.call(
							preload_context,
							{
								host: page.host,
								path: page.path,
								query: page.query,
								params: part.params ? part.params(dest.match) : {}
							},
							$session
						  )
						: {};
				} else {
					preloaded = initial_preloaded_data[i + 1];
				}

				return (props[`level${j}`] = { component, props: preloaded, segment, match, part: part.i });
			})
		);
	} catch (error) {
		props.error = error;
		props.status = 500;
		branch = [];
	}

	return { redirect, props, branch };
}

let prefetching = null;

let mousemove_timeout;

function start$1() {
	addEventListener('touchstart', trigger_prefetch);
	addEventListener('mousemove', handle_mousemove);
}

function prefetch(href) {
	const target = select_target(new URL(href, get_base_uri(document)));

	if (target) {
		if (!prefetching || href !== prefetching.href) {
			prefetching = { href, promise: hydrate_target(target) };
		}

		return prefetching.promise;
	}
}

function get_prefetched(target) {
	if (prefetching && prefetching.href === target.href) {
		return prefetching.promise;
	} else {
		return hydrate_target(target);
	}
}

function trigger_prefetch(event) {
	const a = find_anchor(event.target);

	if (a && a.rel === 'prefetch') {
		prefetch(a.href);
	}
}

function handle_mousemove(event) {
	clearTimeout(mousemove_timeout);
	mousemove_timeout = setTimeout(() => {
		trigger_prefetch(event);
	}, 20);
}

async function prefetchRoutes(pathnames) {
	const path_routes = pathnames
		? routes.filter((route) => pathnames.some((pathname) => route.pattern.test(pathname)))
		: routes;

	const promises = path_routes.map((r) => Promise.all(r.parts.map((p) => p && components[p.i]())));

	await Promise.all(promises);
}

export { goto, prefetch, prefetchRoutes, start };
//# sourceMappingURL=navigation.js.map
