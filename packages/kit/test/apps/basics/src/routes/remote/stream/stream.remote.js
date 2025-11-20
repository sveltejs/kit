import { command, query } from '$app/server';

// TODO 3.0 remove this once we support a high enough version of Node.js
function withResolvers() {
	/** @type {any} */
	let resolve, reject;
	const promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

let i = 0;
let p = withResolvers();

export const next = command(() => {
	i++;
	p.resolve();
	p = withResolvers();
});

export const time = query.stream(async function* () {
	while (i < 2) {
		yield i;
		await p.promise;
	}
});
