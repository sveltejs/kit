import Component from './Component.svelte';

export function load({ data }) {
	// @ts-ignore we want to mutate the server load data
	data.b = Component;
	return data;
}
