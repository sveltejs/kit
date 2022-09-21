import { writable } from 'svelte/store';

let count_layout = 0;
let count_page = 0;

export const redirect_state = writable('initial');

export function increment_layout() {
	count_layout++;
}

export function increment_page() {
	count_page++;
}

export function get_layout() {
	return count_layout;
}

export function get_page() {
	return count_page;
}
