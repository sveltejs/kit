import { client_method } from '../client/singletons.js';

export const disableScrollHandling = /* @__PURE__ */ client_method('disable_scroll_handling');

export const goto = /* @__PURE__ */ client_method('goto');

export const invalidate = /* @__PURE__ */ client_method('invalidate');

export const invalidateAll = /* @__PURE__ */ client_method('invalidate_all');

export const preloadData = /* @__PURE__ */ client_method('preload_data');

export const preloadCode = /* @__PURE__ */ client_method('preload_code');

export const beforeNavigate = /* @__PURE__ */ client_method('before_navigate');

export const afterNavigate = /* @__PURE__ */ client_method('after_navigate');
