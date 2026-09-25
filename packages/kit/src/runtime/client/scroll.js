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
 */
export function restore_scroll(url, reset, popped_scroll) {
	if (reset && autoscroll) {
		if (popped_scroll) {
			scrollTo(popped_scroll.x, popped_scroll.y);
		} else {
			const element = get_hash_element(url, hash_routing);
			if (element) {
				element.scrollIntoView();
			} else {
				scrollTo(0, 0);
			}
		}
	}

	autoscroll = true;
}
