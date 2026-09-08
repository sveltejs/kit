import { hash_routing } from '$app/paths/internal/client';
import { get_hash_element, scroll_state } from './utils.js';

/**
 * This flag is used to avoid client-side navigation when we're only using
 * `location.replace()` to set focus.
 */
let resetting_focus = false;

export function is_resetting_focus() {
	return resetting_focus;
}

/** @param {boolean} reset */
export function blur_active_element(reset) {
	if (
		reset &&
		document.activeElement instanceof HTMLElement &&
		document.activeElement !== document.body
	) {
		document.activeElement.blur();
	}
}

/**
 * @param {URL} url
 * @param {boolean} [scroll]
 */
export function reset_focus(url, scroll = true) {
	const autofocus = document.querySelector('[autofocus]');
	if (autofocus) {
		// @ts-ignore
		autofocus.focus();
	} else {
		// Reset page selection and focus

		// Mimic the browsers' behaviour and set the sequential focus navigation
		// starting point to the fragment identifier.
		const element = get_hash_element(url, hash_routing);
		if (element) {
			const { x, y } = scroll_state();

			// `element.focus()` doesn't work on Safari and Firefox Ubuntu so we need
			// to use this hack with `location.replace()` instead.
			setTimeout(() => {
				const history_state = history.state;

				resetting_focus = true;
				location.replace(new URL(`#${element.id}`, location.href));

				// Firefox has a bug that sets the history state to `null` so we need to
				// restore it after. See https://bugzilla.mozilla.org/show_bug.cgi?id=1199924
				// This is also needed to restore the original hash if we're using hash routing
				history.replaceState(history_state, '', url);

				// If scroll management has already happened earlier, we need to restore
				// the scroll position after setting the sequential focus navigation starting point
				if (scroll) scrollTo(x, y);
				resetting_focus = false;
			});
		} else {
			// If the ID doesn't exist, we try to mimic browsers' behaviour as closely
			// as possible by targeting the first scrollable region. Unfortunately, it's
			// not a perfect match — e.g. shift-tabbing won't immediately cycle up from
			// the end of the page on Chromium
			// See https://html.spec.whatwg.org/multipage/interaction.html#get-the-focusable-area
			const root = document.body;
			const tabindex = root.getAttribute('tabindex');

			root.tabIndex = -1;
			root.focus({ preventScroll: true, focusVisible: false });

			// restore `tabindex` as to prevent `root` from stealing input from elements
			if (tabindex !== null) {
				root.setAttribute('tabindex', tabindex);
			} else {
				root.removeAttribute('tabindex');
			}
		}

		// capture current selection, so we can compare the state after
		// snapshot restoration and afterNavigate callbacks have run
		const selection = getSelection();

		if (selection && selection.type !== 'None') {
			/** @type {Range[]} */
			const ranges = [];

			for (let i = 0; i < selection.rangeCount; i += 1) {
				ranges.push(selection.getRangeAt(i));
			}

			setTimeout(() => {
				if (selection.rangeCount !== ranges.length) return;

				for (let i = 0; i < selection.rangeCount; i += 1) {
					const a = ranges[i];
					const b = selection.getRangeAt(i);

					// we need to do a deep comparison rather than just `a !== b` because
					// Safari behaves differently to other browsers
					if (
						a.commonAncestorContainer !== b.commonAncestorContainer ||
						a.startContainer !== b.startContainer ||
						a.endContainer !== b.endContainer ||
						a.startOffset !== b.startOffset ||
						a.endOffset !== b.endOffset
					) {
						return;
					}
				}

				// if the selection hasn't changed (as a result of an element being (auto)focused,
				// or a programmatic selection, we reset everything as part of the navigation)
				// fixes https://github.com/sveltejs/kit/issues/8439
				selection.removeAllRanges();
			});
		}
	}
}
