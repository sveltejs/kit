import { command, getRequestEvent, query } from '$app/server';

export const live = query.live(async function* () {
	const signal = getRequestEvent().request.signal;
	yield 'connected';
	await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
});

export const reconnect = command(() => {
	live().reconnect();
});
