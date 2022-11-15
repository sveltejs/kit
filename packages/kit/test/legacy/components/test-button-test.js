import { expect } from '@playwright/test';

/**
 * @param {import('@playwright/test').Locator} element
 * @param {string} property
 */
const getCSSPropertyValue = (element, property) =>
	element.evaluate((element, property) => {
		return window.getComputedStyle(element).getPropertyValue(property);
	}, property);

/**
 * @param {import('@playwright/test').Locator} element
 */
const getBackgroundColor = (element) => getCSSPropertyValue(element, 'background-color');

/**
 * @param {import('@playwright/test').Locator} button
 * @param {string} text
 * @param {string[]} colors
 */
async function expectTextAndColor(button, text, colors) {
	text = text.trim();

	const [textValue, colorValue] = await Promise.all([
		button.textContent(),
		getBackgroundColor(button)
	]);

	expect(textValue?.trim()).toBe(text);
	expect(colors).toContain(colorValue);
}

/**
 *
 * @param {{
 * button: import('@playwright/test').Locator;
 * javaScriptEnabled: boolean;
 * }} param0
 */
export const testButtonTest = async ({ button, javaScriptEnabled }) => {
	await expectTextAndColor(button, 'Not Pressed Yet', ['red', 'rgb(255, 0, 0)']);

	if (javaScriptEnabled) {
		await button.click();
		await expectTextAndColor(button, 'Was Pressed!', ['green', 'rgb(0, 128, 0)']);
	}
};
