import { SSR } from '@sveltejs/environment';

/**
 * @type {import('$app/environment').browser}
 */
export const browser = !SSR;

/**
 * @type {import('$app/environment').dev}
 */
export const dev = __SVELTEKIT_DEV__;

export { building, version } from '../env.js';
