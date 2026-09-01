import { beforeEach, expect, test } from 'vitest';
import { blur_active_element, reset_focus } from './focus.js';

beforeEach(() => {
	document.body.innerHTML = '';
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

test("reset_focus restores the hash target's tabindex", () => {
	document.body.innerHTML = '<p id="a" tabindex="0"></p><p id="b"></p>';
	reset_focus(new URL('/#a', location.href));
	expect(document.getElementById('a')?.getAttribute('tabindex')).toBe('0');
	reset_focus(new URL('/#b', location.href));
	expect(document.getElementById('b')?.hasAttribute('tabindex')).toBe(false);
});
