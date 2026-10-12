import { DEV } from 'esm-env';
import { getContext } from 'svelte';
import * as e from '../../../messages/server-errors.js';

function context() {
	return getContext('__request__');
}

/** @param {string} name */
function context_dev(name) {
	try {
		return context();
	} catch {
		e.state_read_outside_render({ name });
	}
}

export const page = {
	get data() {
		return (DEV ? context_dev('page.data') : context()).page.data;
	},
	get error() {
		return (DEV ? context_dev('page.error') : context()).page.error;
	},
	get form() {
		return (DEV ? context_dev('page.form') : context()).page.form;
	},
	get params() {
		return (DEV ? context_dev('page.params') : context()).page.params;
	},
	get route() {
		return (DEV ? context_dev('page.route') : context()).page.route;
	},
	get shallow() {
		return (DEV ? context_dev('page.shallow') : context()).page.shallow;
	},
	get state() {
		return (DEV ? context_dev('page.state') : context()).page.state;
	},
	get status() {
		return (DEV ? context_dev('page.status') : context()).page.status;
	},
	get url() {
		return (DEV ? context_dev('page.url') : context()).page.url;
	}
};

export const navigating = {
	from: null,
	to: null,
	type: null,
	willUnload: null,
	delta: null,
	complete: null
};

export const updated = {
	get current() {
		return false;
	},
	check: () => {
		e.server_api_unavailable({ name: 'updated.check()' });
	}
};
