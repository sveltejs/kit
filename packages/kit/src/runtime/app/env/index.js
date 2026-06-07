export { BROWSER as browser, DEV as dev } from 'esm-env';
export { building, version } from './internal.js';

// force the Vite client to load, so that defines are definitely defined
import.meta.hot;
