import { getContext } from 'svelte';

function context() {
	return getContext('__request__');
}

export const page = {
	get data() {
		return context().page.data;
	},
	get error() {
		return context().page.error;
	},
	get form() {
		return context().page.form;
	},
	get params() {
		return context().page.params;
	},
	get route() {
		return context().page.route;
	},
	get state() {
		return context().page.state;
	},
	get status() {
		return context().page.status;
	},
	get url() {
		return context().page.url;
	}
};

export const navigating = {
	get current() {
		return context().navigating;
	}
};

export const updated = {
	get current() {
		return false;
	},
	check: () => {
		throw new Error('Can only call updated.check() in the browser');
	}
};