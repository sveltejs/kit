import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { reset_focus } from './focus.js';

beforeEach(() => {
	window.scrollTo = vi.fn();
	document.body.innerHTML = '';
});

afterEach(() => {
	vi.useRealTimers();
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
