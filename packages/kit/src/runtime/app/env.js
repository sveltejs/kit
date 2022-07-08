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
export const dev = !!import.meta.env.DEV;

/**
 * @type {import('$app/env').prod}
 */
export const prod = !import.meta.env.DEV;

/**
 * @type {import('$app/env').mode}
 */
export const mode = import.meta.env.MODE;

export { prerendering } from '../env.js';
