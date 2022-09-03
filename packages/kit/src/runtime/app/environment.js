/**
 * @type {import('$app/environment').browser}
 */
export const browser = !import.meta.env.SSR;

/**
 * @type {import('$app/environment').dev}
 */
export const dev = __SVELTEKIT_DEV__;

/**
 * @type {import('$app/environment').prerendering}
 */
export { prerendering } from '../env.js';

/**
 * @type {import('$app/environment').hydrated}
 */
export { hydrated } from '../env.js';
