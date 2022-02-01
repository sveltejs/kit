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
 * @type {import('$app/env').version}
 */
export const version = import.meta.env.VITE_APP_VERSION;

export { prerendering } from '../env.js';
