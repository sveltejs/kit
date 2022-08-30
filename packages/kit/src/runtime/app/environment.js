/**
 * @type {import('$app/environment').browser}
 */
export const browser = !import.meta.env.SSR;

/**
 * @type {import('$app/environment').dev}
 */
export const dev = __SVELTEKIT_DEV__;

export { prerendering } from '../env.js';
