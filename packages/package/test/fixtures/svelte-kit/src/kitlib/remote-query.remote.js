import { query } from '$app/server';

export const getCustomEndpoint = query(() => {
	return { message: 'remote response' };
});
