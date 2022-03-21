import { writable } from 'svelte/store';
import { hash } from '../hash.js';
import { assets } from '../paths.js';

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
	const node = event
		.composedPath()
		.find((e) => e instanceof Node && e.nodeName.toUpperCase() === 'A'); // SVG <a> elements have a lowercase name
	return /** @type {HTMLAnchorElement | SVGAElement | undefined} */ (node);
}

/** @param {HTMLAnchorElement | SVGAElement} node */
export function get_href(node) {
	return node instanceof SVGAElement
		? new URL(node.href.baseVal, document.baseURI)
		: new URL(node.href);
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

	const interval = +(
		/** @type {string} */ (import.meta.env.VITE_SVELTEKIT_APP_VERSION_POLL_INTERVAL)
	);
	const initial = import.meta.env.VITE_SVELTEKIT_APP_VERSION;

	/** @type {NodeJS.Timeout} */
	let timeout;

	async function check() {
		if (import.meta.env.DEV || import.meta.env.SSR) return false;

		clearTimeout(timeout);

		if (interval) timeout = setTimeout(check, interval);

		const file = import.meta.env.VITE_SVELTEKIT_APP_VERSION_FILE;

		const res = await fetch(`${assets}/${file}`, {
			headers: {
				pragma: 'no-cache',
				'cache-control': 'no-cache'
			}
		});

		if (res.ok) {
			const { version } = await res.json();
			const updated = version !== initial;

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
 * @param {RequestInfo} resource
 * @param {RequestInit} [opts]
 */
export function initial_fetch(resource, opts) {
	const url = JSON.stringify(typeof resource === 'string' ? resource : resource.url);

	let selector = `script[sveltekit\\:data-type="data"][sveltekit\\:data-url=${url}]`;

	if (opts && typeof opts.body === 'string') {
		selector += `[sveltekit\\:data-body="${hash(opts.body)}"]`;
	}

	const script = document.querySelector(selector);
	if (script && script.textContent) {
		const { body, ...init } = JSON.parse(script.textContent);
		return Promise.resolve(new Response(body, init));
	}

	return fetch(resource, opts);
}
