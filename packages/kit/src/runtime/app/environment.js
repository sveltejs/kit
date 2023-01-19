import { BROWSER, DEV } from 'esm-env';

/**
 * @type {import('$app/environment').browser}
 */
export const browser = BROWSER;

/**
 * @type {import('$app/environment').dev}
 */
export const dev = DEV;

export { building, version } from '../shared.js';
