import { getContext } from 'svelte';

export const stores = () => getContext('__svelte__');

export { default as start } from './app';
export { default as goto } from './goto/index';
export { default as prefetch } from './prefetch/index';
export { default as prefetchRoutes } from './prefetchRoutes/index';
