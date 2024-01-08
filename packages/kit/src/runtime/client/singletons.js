import { writable } from 'svelte/store';
import { create_updated_store, notifiable_store } from './utils.js';

export const stores = {
	url: /* @__PURE__ */ notifiable_store({}),
	page: /* @__PURE__ */ notifiable_store({}),
	navigating: /* @__PURE__ */ writable(
		/** @type {import('@sveltejs/kit').Navigation | null} */ (null)
	),
	updated: /* @__PURE__ */ create_updated_store()
};
