import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { blur_active_element, reset_focus } from './focus.js';

beforeEach(() => {
	window.scrollTo = vi.fn();
	document.body.innerHTML = '';
});

afterEach(() => {
	vi.useRealTimers();
});

test('blur_active_element blurs a focused SVG element', () => {
	document.body.innerHTML = '<svg tabindex="0"></svg>';
	const svg = /** @type {SVGElement} */ (document.body.firstElementChild);
	svg.focus();
	expect(document.activeElement).toBe(svg);

	blur_active_element(true);
	expect(document.activeElement).toBe(document.body);
});

test('reset_focus focuses the body without leaving a tabindex behind', () => {
	document.body.innerHTML = '<input>';
	/** @type {HTMLInputElement} */ (document.body.firstElementChild).focus();
	reset_focus(new URL('/', location.href));
	expect(document.activeElement).toBe(document.body);
	expect(document.body.hasAttribute('tabindex')).toBe(false);
});

test('reset_focus restores the scroll position after jumping to the hash target', () => {
	vi.useFakeTimers();
	Object.defineProperty(window, 'pageYOffset', { value: 400, configurable: true });
	document.body.innerHTML = '<div id="a"></div>';
	reset_focus(new URL('/#a', location.href));
	expect(window.scrollTo).not.toHaveBeenCalled();
	vi.runAllTimers();
	expect(window.scrollTo).toHaveBeenCalledWith(0, 400);
});
