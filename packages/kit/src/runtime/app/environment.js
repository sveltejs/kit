import { BROWSER } from 'esm-env';

/**
 * @type {import('$app/environment').browser}
 */
export const browser = BROWSER;

/**
 * @type {import('$app/environment').dev}
 */
export const dev = __SVELTEKIT_DEV__;

export { building, version } from '../env.js';
