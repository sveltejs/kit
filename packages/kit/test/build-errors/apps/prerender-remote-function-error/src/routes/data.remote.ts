import { prerender } from '$app/server';

export const throws = prerender(() => {
	throw new Error('remote function blew up');
});
