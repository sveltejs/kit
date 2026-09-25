import { beforeEach, expect, test, vi } from 'vitest';
import { disable_scroll_handling, restore_scroll } from './scroll.js';

const url = new URL('/', location.href);

beforeEach(() => {
	window.scrollTo = vi.fn();
	Element.prototype.scrollIntoView = vi.fn();
	document.body.innerHTML = '';
});

test('restores a popped position ahead of the hash target', () => {
	document.body.innerHTML = '<div id="a"></div>';
	restore_scroll(new URL('/#a', location.href), true, { x: 10, y: 20 });
	expect(window.scrollTo).toHaveBeenCalledWith(10, 20);
	expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});

test('disable_scroll_handling is consumed by the next navigation, reset or not', () => {
	disable_scroll_handling();
	restore_scroll(url, true, null);
	expect(window.scrollTo).not.toHaveBeenCalled();
	restore_scroll(url, true, null);
	expect(window.scrollTo).toHaveBeenCalledTimes(1);

	disable_scroll_handling();
	restore_scroll(url, false, null);
	restore_scroll(url, true, null);
	expect(window.scrollTo).toHaveBeenCalledTimes(2);
});
