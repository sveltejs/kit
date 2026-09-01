import { hash_routing } from '$app/paths/internal/client';
import { get_hash_element } from './utils.js';

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
 * Sets the sequential focus navigation starting point to `element` without leaving it focused
 * @param {Element} element
 */
function focus_element(element) {
	const tabindex = element.getAttribute('tabindex');

	element.setAttribute('tabindex', '-1');
	/** @type {HTMLElement} */ (element).focus({ preventScroll: true, focusVisible: false });

	// removing `tabindex` blurs it again, synchronously in Chromium and a frame later elsewhere
	if (tabindex !== null) {
		element.setAttribute('tabindex', tabindex);
	} else {
		element.removeAttribute('tabindex');
	}
}

/** @param {URL} url */
export function reset_focus(url) {
	const autofocus = document.querySelector('[autofocus]');
	if (autofocus) {
		// @ts-ignore
		autofocus.focus();
	} else {
		// set the sequential focus navigation starting point to the fragment identifier, or to
		// the first scrollable region when there is none. Not a perfect match for browsers:
		// shift-tabbing won't immediately cycle up from the end of the page on Chromium
		// See https://html.spec.whatwg.org/multipage/interaction.html#get-the-focusable-area
		focus_element(get_hash_element(url, hash_routing) ?? document.body);

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
