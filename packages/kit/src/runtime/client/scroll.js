import { hash_routing } from '$app/paths/internal/client';
import { reset_focus } from './focus.js';
import { get_hash_element } from './utils.js';

let autoscroll = true;

export function disable_scroll_handling() {
	autoscroll = false;
}

/**
 * @param {URL} url
 * @param {{ x: number; y: number } | null | undefined} scroll
 * @param {boolean} reset
 * @param {Element | null} active_element
 */
export function reset_scroll_and_focus(url, scroll, reset, active_element) {
	/** @type {Element | null} */
	let deep_linked = null;

	if (autoscroll) {
		if (scroll) {
			scrollTo(scroll.x, scroll.y);
		} else if ((deep_linked = get_hash_element(url, hash_routing))) {
			deep_linked.scrollIntoView();
		} else {
			scrollTo(0, 0);
		}
	}

	const changed_focus =
		document.activeElement !== active_element && document.activeElement !== document.body;

	if (reset && !changed_focus) {
		reset_focus(url, !deep_linked);
	}

	autoscroll = true;
}
