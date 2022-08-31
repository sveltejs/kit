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

	const options = {
		/** @type {string | null} */
		noscroll: null,

		/** @type {string | null} */
		prefetch: null,

		/** @type {string | null} */
		reload: null
	};

	for (const element of event.composedPath()) {
		if (!(element instanceof Element)) continue;

		if (!a && element.nodeName.toUpperCase() === 'A') {
			// SVG <a> elements have a lowercase name
			a = /** @type {HTMLAnchorElement | SVGAElement} */ (element);
		}

		if (options.noscroll === null) {
			options.noscroll = element.getAttribute('data-sveltekit-noscroll');
		}

		if (options.prefetch === null) {
			options.prefetch = element.getAttribute('data-sveltekit-prefetch');
		}

		if (options.reload === null) {
			options.reload = element.getAttribute('data-sveltekit-reload');
		}
	}

	const url = a && new URL(a instanceof SVGAElement ? a.href.baseVal : a.href, document.baseURI);

	return { a, url, options };
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
