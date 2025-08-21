import { command, query } from '$app/server';

let i = 0;
let p = Promise.withResolvers();

export const next = command(() => {
	i++;
	p.resolve();
	p = Promise.withResolvers();
});

export const time = query.stream(async function* () {
	while (i < 2) {
		yield i;
		await p.promise;
	}
});
