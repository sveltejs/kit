import { beforeEach, expect, test, vi } from 'vitest';
import { disable_scroll_handling, reset_scroll_and_focus } from './scroll.js';

const url = new URL('/', location.href);

beforeEach(() => {
	window.scrollTo = vi.fn();
	Element.prototype.scrollIntoView = vi.fn();
	document.body.innerHTML = '';
});

test('restores a popped position ahead of the hash target', () => {
	document.body.innerHTML = '<div id="a"></div>';
	reset_scroll_and_focus(new URL('/#a', location.href), { x: 10, y: 20 }, true, document.body);
	expect(window.scrollTo).toHaveBeenCalledWith(10, 20);
	expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});

test('disable_scroll_handling is consumed by the next navigation, reset or not', () => {
	disable_scroll_handling();
	reset_scroll_and_focus(url, null, true, document.body);
	expect(window.scrollTo).not.toHaveBeenCalled();
	reset_scroll_and_focus(url, null, true, document.body);
	expect(window.scrollTo).toHaveBeenCalledTimes(1);

	disable_scroll_handling();
	reset_scroll_and_focus(url, null, false, document.body);
	reset_scroll_and_focus(url, null, true, document.body);
	expect(window.scrollTo).toHaveBeenCalledTimes(2);
});
