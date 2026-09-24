import { hash_routing } from '$app/paths/internal/client';
import { get_hash_element } from './utils.js';

let autoscroll = true;

/** Disables scroll handling for the next `restore_scroll` */
export function disable_scroll_handling() {
	autoscroll = false;
}

/**
 * After a navigation that resets, scrolls to `popped_scroll` ?? the hash target ?? the top,
 * unless `disable_scroll_handling` was called since the last navigation
 * @param {URL} url
 * @param {boolean} reset
 * @param {{ x: number; y: number } | null | undefined} popped_scroll
 * @returns {Element | null} the hash target, when that is what was scrolled into view
 */
export function restore_scroll(url, reset, popped_scroll) {
	/** @type {Element | null} */
	let deep_linked = null;

	if (reset && autoscroll) {
		if (popped_scroll) {
			scrollTo(popped_scroll.x, popped_scroll.y);
		} else if ((deep_linked = get_hash_element(url, hash_routing))) {
			deep_linked.scrollIntoView();
		} else {
			scrollTo(0, 0);
		}
	}

	autoscroll = true;

	return deep_linked;
}
