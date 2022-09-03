import { writable } from 'svelte/store';
import { assets } from '../paths.js';

/* global __SVELTEKIT_APP_VERSION__, __SVELTEKIT_APP_VERSION_FILE__, __SVELTEKIT_APP_VERSION_POLL_INTERVAL__ */

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

/** @param {Event} event */
export function find_anchor(event) {
	/** @type {HTMLAnchorElement | SVGAElement | undefined} */
	let a;

	/** @type {boolean | null} */
	let noscroll = null;

	/** @type {boolean | null} */
	let prefetch = null;

	/** @type {boolean | null} */
	let reload = null;

	for (const element of event.composedPath()) {
		if (!(element instanceof Element)) continue;

		if (!a && element.nodeName.toUpperCase() === 'A') {
			// SVG <a> elements have a lowercase name
			a = /** @type {HTMLAnchorElement | SVGAElement} */ (element);
		}

		if (noscroll === null) noscroll = get_link_option(element, 'data-sveltekit-noscroll');
		if (prefetch === null) prefetch = get_link_option(element, 'data-sveltekit-prefetch');
		if (reload === null) reload = get_link_option(element, 'data-sveltekit-reload');
	}

	const url = a && new URL(a instanceof SVGAElement ? a.href.baseVal : a.href, document.baseURI);

	return {
		a,
		url,
		options: {
			noscroll,
			prefetch,
			reload
		}
	};
}

const warned = new WeakSet();

/**
 * @param {Element} element
 * @param {string} attribute
 */
function get_link_option(element, attribute) {
	const value = element.getAttribute(attribute);
	if (value === null) return value;

	if (value === '') return true;
	if (value === 'off') return false;

	if (__SVELTEKIT_DEV__ && !warned.has(element)) {
		console.error(`Unexpected value for ${attribute} — should be "" or "off"`, element);
		warned.add(element);
	}

	return false;
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
			const { version } = await res.json();
			const updated = version !== __SVELTEKIT_APP_VERSION__;

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
