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

/**
 * Blurs the active element before the DOM update when a navigation resets focus, so that
 * blur/focusout handlers run while the outgoing component's data is still valid (#14575)
 * @param {boolean} reset
 */
export function blur_active_element(reset) {
	const element = document.activeElement;

	if (
		reset &&
		(element instanceof HTMLElement || element instanceof SVGElement) &&
		element !== document.body
	) {
		element.blur();
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

			// focusing a non-focusable element is a no-op, so navigate to the fragment
			// instead; see sveltejs/kit#16982 for the tabindex alternative
			setTimeout(() => {
				const history_state = history.state;

				resetting_focus = true;
				location.replace(new URL(`#${element.id}`, location.href));

				// a fragment navigation nulls `history.state` (per spec; WebKit keeps it), so
				// restore it. This also restores the original hash if we're using hash routing
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

					// compare field by field: a range modified in place keeps its identity,
					// and Safari before 17 returned a new Range object on every getRangeAt()
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
