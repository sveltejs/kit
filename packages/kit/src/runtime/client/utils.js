import { writable } from 'svelte/store';
import { assets } from '../paths.js';
import { version } from '../env.js';

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

/**
 * @param {Element} element
 * @param {string | null} attribute
 * @param {string[]} options
 */
function validate(element, attribute, options) {
	if (warned.has(element)) return;
	if (attribute === null) return;
	if (!options.includes(attribute)) {
		warned.add(element);
		console.error(
			`Unexpected value for ${attribute} — should be one of ${options
				.map((option) => JSON.stringify(option))
				.join(', ')}`,
			element
		);
	}
}

/** @param {Element} element */
export function find_anchor(element) {
	/** @type {HTMLAnchorElement | SVGAElement | undefined} */
	let a;

	/** @type {string | null} */
	let noscroll = null;

	/** @type {string | null} */
	let preload = null;

	/** @type {string | null} */
	let reload = null;

	while (element) {
		if (!a && element.nodeName.toUpperCase() === 'A') {
			// SVG <a> elements have a lowercase name
			a = /** @type {HTMLAnchorElement | SVGAElement} */ (element);
		}

		if (noscroll === null) noscroll = element.getAttribute('data-sveltekit-noscroll');
		if (preload === null) preload = element.getAttribute('data-sveltekit-preload');
		if (reload === null) reload = element.getAttribute('data-sveltekit-reload');

		if (__SVELTEKIT_DEV__) {
			validate(element, preload, ['', 'off', 'tap', 'hover', 'viewport', 'page']);
			validate(element, noscroll, ['', 'off']);
			validate(element, reload, ['', 'off']);
		}

		// @ts-expect-error
		element = element.parentNode?.host ?? element.parentNode;
	}

	const url = a && new URL(a instanceof SVGAElement ? a.href.baseVal : a.href, document.baseURI);

	return {
		a,
		url,
		options: {
			preload: preload === '' ? 'hover' : preload,
			noscroll: noscroll === 'off' ? false : noscroll === '' ? true : null,
			reload: reload === 'off' ? false : reload === '' ? true : null
		},
		has: a
			? {
					rel_external: (a.getAttribute('rel') || '').split(/\s+/).includes('external'),
					download: a.hasAttribute('download'),
					target: !!(a instanceof SVGAElement ? a.target.baseVal : a.target)
			  }
			: {}
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
