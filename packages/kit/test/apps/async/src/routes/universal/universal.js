import * as v from 'valibot';
import { invalid } from '@sveltejs/kit';
import { browser } from '$app/env';
import { command, form, query } from '$app/universal';

const ran_on = () => (browser ? 'browser' : 'server');

/**
 * Lets tests hold a mutation in flight, so that optimistic updates can be observed
 */
export const gate = {
	/** @type {Promise<void> | null} */
	promise: null,
	/** @type {() => void} */
	resolve: () => {},
	close() {
		this.promise = new Promise((resolve) => (this.resolve = resolve));
	},
	open() {
		this.resolve();
		this.promise = null;
	}
};

export const get_count = query(async () => {
	const response = await fetch('/universal/api/count');
	const { count } = await response.json();
	return { count: /** @type {number} */ (count), ran_on: ran_on() };
});

export const get_item = query.batch(async (/** @type {string[]} */ ids) => {
	const response = await fetch(`/universal/api/items?ids=${ids.join(',')}`);
	/** @type {Record<string, string>} */
	const items = await response.json();
	return (id) => items[id];
});

export const get_ticks = query.live(async function* () {
	let i = 0;

	while (true) {
		yield i++;
		await new Promise((f) => setTimeout(f, 100));
	}
});

export const set_count = command(async (/** @type {number} */ count) => {
	await gate.promise;

	await fetch('/universal/api/count', {
		method: 'POST',
		body: JSON.stringify({ count })
	});

	return count;
});

export const get_todos = query(async () => {
	const response = await fetch('/universal/api/todos');
	return /** @type {Promise<string[]>} */ (response.json());
});

export const add_todo = form(
	v.object({
		text: v.pipe(v.string(), v.minLength(3, 'text is too short'))
	}),
	async ({ text }, issue) => {
		await gate.promise;

		const response = await fetch('/universal/api/todos', {
			method: 'POST',
			body: JSON.stringify({ text })
		});

		if (!response.ok) {
			invalid(issue.text((await response.json()).message));
		}

		return { added: text, ran_on: ran_on() };
	}
);
