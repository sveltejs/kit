export const browser = !import.meta.env.SSR;
export const dev = !!import.meta.env.DEV;
export const amp = !!import.meta.env.VITE_SVELTEKIT_AMP;
export { prerendering } from '../env.js';
