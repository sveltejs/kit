import { getRequestEvent, query } from '$app/server';

export const get_event = query(() => {
	const event = getRequestEvent();
	const results: string[] = [];

	for (const property of ['url', 'params', 'route'] as const) {
		try {
			results.push(`${property}: ${String(event[property])}`);
		} catch (error) {
			results.push((error as Error).message);
		}
	}

	return results.join(' | ');
});
