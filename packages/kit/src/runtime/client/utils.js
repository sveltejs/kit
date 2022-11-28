import { writable } from 'svelte/store';
import { assets } from '../paths.js';
import { version } from '../env.js';
import { PRELOAD_PRIORITIES } from './constants.js';

/* global __SVELTEKIT_APP_VERSION_FILE__, __SVELTEKIT_APP_VERSION_POLL_INTERVAL__ */

/** @param {HTMLDocument} doc */
export function get_base_uri(doc) {
	let baseURI = doc.baseURI;

	if (!baseURI) {
		const baseTags = doc.getElementsByTagName('base');
		baseURI = baseTags.length ? baseTags[0].href : doc.URL;
	}

	return baseURI;
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
	'preload-code': ['', 'off', 'tap', 'hover', 'viewport', 'eager'],
	'preload-data': ['', 'off', 'tap', 'hover'],
	noscroll: ['', 'off'],
	reload: ['', 'off']
});

/**
 * @template {LinkOptionName} T
 * @param {Element} element
 * @param {T} name
 */
function link_option(element, name) {
	const value = /** @type {typeof valid_link_options[T][number] | null} */ (
		element.getAttribute(`data-sveltekit-${name}`)
	);

	if (__SVELTEKIT_DEV__) validate_link_option(element, name, value);

	return value;
}

/**
 * @template {LinkOptionName} T
 * @template {typeof valid_link_options[T][number] | null} U
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
 * @param {string} base
 */
export function find_anchor(element, base) {
	/** @type {HTMLAnchorElement | SVGAElement | undefined} */
	let a;

	/** @type {typeof valid_link_options['noscroll'][number] | null} */
	let noscroll = null;

	/** @type {typeof valid_link_options['preload-code'][number] | null} */
	let preload_code = null;

	/** @type {typeof valid_link_options['preload-data'][number] | null} */
	let preload_data = null;

	/** @type {typeof valid_link_options['reload'][number] | null} */
	let reload = null;

	while (element !== document.documentElement) {
		if (!a && element.nodeName.toUpperCase() === 'A') {
			// SVG <a> elements have a lowercase name
			a = /** @type {HTMLAnchorElement | SVGAElement} */ (element);
		}

		if (a) {
			if (preload_code === null) preload_code = link_option(element, 'preload-code');
			if (preload_data === null) preload_data = link_option(element, 'preload-data');
			if (noscroll === null) noscroll = link_option(element, 'noscroll');
			if (reload === null) reload = link_option(element, 'reload');
		}

		// @ts-expect-error handle shadow roots
		element = element.assignedSlot ?? element.parentNode;

		// @ts-expect-error handle shadow roots
		if (element.nodeType === 11) element = element.host;
	}

	/** @type {URL | undefined} */
	let url;

	try {
		url = a && new URL(a instanceof SVGAElement ? a.href.baseVal : a.href, document.baseURI);
	} catch {}

	const options = {
		preload_code: levels[preload_code ?? 'off'],
		preload_data: levels[preload_data ?? 'off'],
		noscroll: noscroll === 'off' ? false : noscroll === '' ? true : null,
		reload: reload === 'off' ? false : reload === '' ? true : null
	};

	const has = a
		? {
				rel_external: (a.getAttribute('rel') || '').split(/\s+/).includes('external'),
				download: a.hasAttribute('download'),
				target: !!(a instanceof SVGAElement ? a.target.baseVal : a.target)
		  }
		: {};

	const external =
		!url ||
		is_external_url(url, base) ||
		options.reload ||
		has.rel_external ||
		has.target ||
		has.download;

	return {
		a,
		url,
		options,
		external,
		has
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

	const interval = __SVELTEKIT_APP_VERSION_POLL_INTERVAL__;

	/** @type {NodeJS.Timeout} */
	let timeout;

	async function check() {
		if (import.meta.env.DEV || import.meta.env.SSR) return false;

		clearTimeout(timeout);

		if (interval) timeout = setTimeout(check, interval);

		const res = await fetch(`${assets}/${__SVELTEKIT_APP_VERSION_FILE__}`, {
			headers: {
				pragma: 'no-cache',
				'cache-control': 'no-cache'
			}
		});

		if (res.ok) {
			const data = await res.json();
			const updated = data.version !== version;

			if (updated) {
				set(true);
				clearTimeout(timeout);
			}

			return updated;
		} else {
			throw new Error(`Version check failed: ${res.status}`);
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
	return url.origin !== location.origin || !url.pathname.startsWith(base);
}
