import { page as _page, navigating as _navigating } from '../../client/state.svelte.js';

/** @type {import('@sveltejs/kit').Page} */
export const page = {
	get data() {
		return _page.data;
	},
	get error() {
		return _page.error;
	},
	get form() {
		return _page.form;
	},
	get params() {
		return _page.params;
	},
	get route() {
		return _page.route;
	},
	get state() {
		return _page.state;
	},
	get status() {
		return _page.status;
	},
	get url() {
		return _page.url;
	}
};

/** @type {{ get current(): import('@sveltejs/kit').Navigation | null }} */
export const navigating = {
	get current() {
		return _navigating.current;
	}
};
