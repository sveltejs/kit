import { expect, test } from 'vitest';
import { create_headers } from './headers.js';

/** @param {ReturnType<typeof create_headers>} store */
function read(store) {
	const target = new Headers();
	store.apply(target);
	return Object.fromEntries(target);
}

function setup() {
	return create_headers(/** @type {import('types').RequestState} */ ({}));
}

test('throws when a header is set twice', () => {
	const headers = setup();
	headers.set({ 'cache-control': 'no-store' });

	expect(() => headers.set({ 'Cache-Control': 'no-store' })).toThrow(
		'"Cache-Control" header is already set'
	);
});

test('throws when a held header is already set, or set again while held', () => {
	const headers = setup();
	headers.set({ 'cache-control': 'no-store' });
	headers.hold();

	expect(() => headers.set({ 'cache-control': 'no-store' })).toThrow('already set');

	headers.set({ vary: 'accept' });
	expect(() => headers.set({ vary: 'accept' })).toThrow('already set');
});

test('appends server-timing across held and committed headers', () => {
	const headers = setup();
	headers.set({ 'server-timing': 'handle;dur=1' });
	headers.hold();
	headers.set({ 'server-timing': 'load;dur=2' });
	headers.set({ 'server-timing': 'render;dur=3' });
	headers.commit();

	expect(read(headers)).toEqual({
		'server-timing': 'handle;dur=1, load;dur=2, render;dur=3'
	});
});

test('drops discarded headers, so they can be set again', () => {
	const headers = setup();
	headers.set({ 'x-handle': '1' });
	headers.hold();
	headers.set({ 'cache-control': 'public, max-age=60' });
	headers.discard();
	headers.set({ 'cache-control': 'private, max-age=60' });

	expect(read(headers)).toEqual({ 'x-handle': '1', 'cache-control': 'private, max-age=60' });
});
