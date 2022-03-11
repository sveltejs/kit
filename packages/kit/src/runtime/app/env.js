/**
 * @type {import('$app/env').browser}
 */
export const browser = !import.meta.env.SSR;
/**
 * @type {import('$app/env').dev}
 */
export const dev = !!import.meta.env.DEV;
/**
 * @type {import('$app/env').mode}
 */
export const mode = import.meta.env.MODE;
/**
 * @type {import('$app/env').amp}
 */
export const amp = !!import.meta.env.VITE_SVELTEKIT_AMP;
/**
 * @type {import('$app/env').env}
 */
export const env = extractEnv();

export { prerendering } from '../env.js';

function extractEnv() {
	if (typeof process === 'object' && typeof process.env === 'object') {
		return process.env;
	}
	if (typeof document !== 'undefined') {
		const el = document.querySelector('script[type="svelte/env"]');
		if (el) {
			return new Function('return ' + el?.textContent)();
		}
	}
	return {};
}
