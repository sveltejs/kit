import { noop, disallow_on_server } from '../../../utils/functions.js';

export const afterNavigate = noop;
export const beforeNavigate = noop;
export const disableScrollHandling = disallow_on_server('disableScrollHandling', '()');
export const goto = disallow_on_server('goto');
export const invalidate = disallow_on_server('invalidate');
export const invalidateAll = disallow_on_server('invalidateAll', '()');
export const onNavigate = noop;
export const refreshAll = disallow_on_server('refreshAll', '()');
export const preloadCode = disallow_on_server('preloadCode');
export const preloadData = disallow_on_server('preloadData');
export const pushState = disallow_on_server('pushState');
export const replaceState = disallow_on_server('replaceState');
export const snapshot = noop;
