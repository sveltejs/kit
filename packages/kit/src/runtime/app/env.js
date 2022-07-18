/* global __SVELTEKIT_BUILD__ */

/**
 * @type {import('$app/env').browser}
 */
export const browser = !import.meta.env.SSR;

/**
 * @type {import('$app/env').server}
 */
export const server = !!import.meta.env.SSR;

/**
 * @type {import('$app/env').dev}
 */
export const dev = !__SVELTEKIT_BUILD__;

/**
 * @type {import('$app/env').prod}
 */
export const prod = __SVELTEKIT_BUILD__;

/**
 * @type {import('$app/env').mode}
 */
export const mode = import.meta.env.MODE;

export { prerendering } from '../env.js';
