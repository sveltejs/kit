import { async_dedupe } from '../../dedupe.js';

export async function load({ fetch }) {
	// Make sure de-duping works in the page
	let [count, a1, a2] = await async_dedupe('foo', 'bar');
	if (a1 !== 'foo' || a2 !== 'bar') {
		throw new Error('Invalid response');
	}
	let newCount;
	[newCount, a1, a2] = await async_dedupe('foo', 'bar');
	if (newCount !== count) {
		throw new Error('Invalid count');
	}

	// Make sure de-duping works in sub-requests
	const res = await fetch('/dedupe/async/page/server');
	[newCount, a1, a2] = await res.json();
	if (newCount !== count) {
		throw new Error('Invalid count in sub-request');
	}
	return {};
}
