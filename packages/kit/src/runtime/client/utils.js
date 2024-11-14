import { BROWSER, DEV } from 'esm-env';
import { writable } from 'svelte/store';
import { assets } from '__sveltekit/paths';
import { version } from '__sveltekit/environment';
import { PRELOAD_PRIORITIES } from './constants.js';

/* global __SVELTEKIT_APP_VERSION_FILE__, __SVELTEKIT_APP_VERSION_POLL_INTERVAL__ */

export const origin = BROWSER ? location.origin : '';

/** @param {string | URL} url */
export function resolve_url(url) {
	if (url instanceof URL) return url;

	let baseURI = document.baseURI;

	if (!baseURI) {
		const baseTags = document.getElementsByTagName('base');
		baseURI = baseTags.length ? baseTags[0].href : document.URL;
	}

	return new URL(url, baseURI);
}

export function scroll_state() {
	return {
		x: pageXOffset,
		y: pageYOffset
	};
}

const warned = new WeakSet();

/** @typedef {keyof typeof valid_link_options} LinkOptionName */

const valid_link_options = /** @type {const} */ ({
	'preload-code': ['', 'off', 'false', 'tap', 'hover', 'viewport', 'eager'],
	'preload-data': ['', 'off', 'false', 'tap', 'hover'],
	keepfocus: ['', 'true', 'off', 'false'],
	noscroll: ['', 'true', 'off', 'false'],
	reload: ['', 'true', 'off', 'false'],
	replacestate: ['', 'true', 'off', 'false']
});

/**
 * @template {LinkOptionName} T
 * @typedef {typeof valid_link_options[T][number]} ValidLinkOptions
 */

/**
 * @template {LinkOptionName} T
 * @param {Element} element
 * @param {T} name
 */
function link_option(element, name) {
	const value = /** @type {ValidLinkOptions<T> | null} */ (
		element.getAttribute(`data-sveltekit-${name}`)
	);

	if (DEV) {
		validate_link_option(element, name, value);
	}

	return value;
}

/**
 * @template {LinkOptionName} T
 * @template {ValidLinkOptions<T> | null} U
 * @param {Element} element
 * @param {T} name
 * @param {U} value
 */
function validate_link_option(element, name, value) {
	if (value === null) return;

	// @ts-expect-error - includes is dumb
	if (!warned.has(element) && !valid_link_options[name].includes(value)) {
		console.error(
			`Unexpected value for ${name} — should be one of ${valid_link_options[name]
				.map((option) => JSON.stringify(option))
				.join(', ')}`,
			element
		);

		warned.add(element);
	}
}

const levels = {
	...PRELOAD_PRIORITIES,
	'': PRELOAD_PRIORITIES.hover
};

/**
 * @param {Element} element
 * @returns {Element | null}
 */
function parent_element(element) {
	let parent = element.assignedSlot ?? element.parentNode;

	// @ts-expect-error handle shadow roots
	if (parent?.nodeType === 11) parent = parent.host;

	return /** @type {Element} */ (parent);
}

/**
 * @param {Element} element
 * @param {Element} target
 */
export function find_anchor(element, target) {
	while (element && element !== target) {
		if (element.nodeName.toUpperCase() === 'A' && element.hasAttribute('href')) {
			return /** @type {HTMLAnchorElement | SVGAElement} */ (element);
		}

		element = /** @type {Element} */ (parent_element(element));
	}
}

/**
 * @param {HTMLAnchorElement | SVGAElement} a
 * @param {string} base
 */
export function get_link_info(a, base) {
	/** @type {URL | undefined} */
	let url;

	try {
		url = new URL(a instanceof SVGAElement ? a.href.baseVal : a.href, document.baseURI);
	} catch {}

	const target = a instanceof SVGAElement ? a.target.baseVal : a.target;

	const external =
		!url ||
		!!target ||
		is_external_url(url, base) ||
		(a.getAttribute('rel') || '').split(/\s+/).includes('external');

	const download = url?.origin === origin && a.hasAttribute('download');

	return { url, external, target, download };
}

/**
 * @param {HTMLFormElement | HTMLAnchorElement | SVGAElement} element
 */
export function get_router_options(element) {
	/** @type {ValidLinkOptions<'keepfocus'> | null} */
	let keepfocus = null;

	/** @type {ValidLinkOptions<'noscroll'> | null} */
	let noscroll = null;

	/** @type {ValidLinkOptions<'preload-code'> | null} */
	let preload_code = null;

	/** @type {ValidLinkOptions<'preload-data'> | null} */
	let preload_data = null;

	/** @type {ValidLinkOptions<'reload'> | null} */
	let reload = null;

	/** @type {ValidLinkOptions<'replacestate'> | null} */
	let replace_state = null;

	/** @type {Element} */
	let el = element;

	while (el && el !== document.documentElement) {
		if (preload_code === null) preload_code = link_option(el, 'preload-code');
		if (preload_data === null) preload_data = link_option(el, 'preload-data');
		if (keepfocus === null) keepfocus = link_option(el, 'keepfocus');
		if (noscroll === null) noscroll = link_option(el, 'noscroll');
		if (reload === null) reload = link_option(el, 'reload');
		if (replace_state === null) replace_state = link_option(el, 'replacestate');

		el = /** @type {Element} */ (parent_element(el));
	}

	/** @param {string | null} value */
	function get_option_state(value) {
		switch (value) {
			case '':
			case 'true':
				return true;
			case 'off':
			case 'false':
				return false;
			default:
				return undefined;
		}
	}

	return {
		preload_code: levels[preload_code ?? 'off'],
		preload_data: levels[preload_data ?? 'off'],
		keepfocus: get_option_state(keepfocus),
		noscroll: get_option_state(noscroll),
		reload: get_option_state(reload),
		replace_state: get_option_state(replace_state)
	};
}

/** @param {any} value */
export function notifiable_store(value) {
	const store = writable(value);
	let ready = true;

	function notify() {
		ready = true;
		store.update((val) => val);
	}

	/** @param {any} new_value */
	function set(new_value) {
		ready = false;
		store.set(new_value);
	}

	/** @param {(value: any) => void} run */
	function subscribe(run) {
		/** @type {any} */
		let old_value;
		return store.subscribe((new_value) => {
			if (old_value === undefined || (ready && new_value !== old_value)) {
				run((old_value = new_value));
			}
		});
	}

	return { notify, set, subscribe };
}

export function create_updated_store() {
	const { set, subscribe } = writable(false);

	if (DEV || !BROWSER) {
		return {
			subscribe,
			// eslint-disable-next-line @typescript-eslint/require-await
			check: async () => false
		};
	}

	const interval = __SVELTEKIT_APP_VERSION_POLL_INTERVAL__;

	/** @type {NodeJS.Timeout} */
	let timeout;

	/** @type {() => Promise<boolean>} */
	async function check() {
		clearTimeout(timeout);

		if (interval) timeout = setTimeout(check, interval);

		try {
			const res = await fetch(`${assets}/${__SVELTEKIT_APP_VERSION_FILE__}`, {
				headers: {
					pragma: 'no-cache',
					'cache-control': 'no-cache'
				}
			});

			if (!res.ok) {
				return false;
			}

			const data = await res.json();
			const updated = data.version !== version;

			if (updated) {
				set(true);
				clearTimeout(timeout);
			}

			return updated;
		} catch {
			return false;
		}
	}

	if (interval) timeout = setTimeout(check, interval);

	return {
		subscribe,
		check
	};
}

/**
 * @param {URL} url
 * @param {string} base
 */
export function is_external_url(url, base) {
	return url.origin !== origin || !url.pathname.startsWith(base);
}
