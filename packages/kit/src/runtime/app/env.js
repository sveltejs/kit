/**
 * @type {import('$app/env').browser}
 */
export const browser = !import.meta.env.SSR;

/**
 * @type {import('$app/env').dev}
 */
export const dev = __SVELTEKIT_DEV__;

export { prerendering } from '../env.js';
