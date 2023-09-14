import { BROWSER, DEV } from 'esm-env';
export { building, version } from '__sveltekit/environment';

/**
 * `true` si l'application est exécutée dans le navigateur.
 */
export const browser = BROWSER;

/**
 * `true` si le serveur de développement est lancé. Ne correspond pas nécessairement à ce que peut indiquer `NODE_ENV` ou `MODE`.
 */
export const dev = DEV;
