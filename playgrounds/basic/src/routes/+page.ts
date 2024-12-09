import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const response = await fetch('/', { method: 'POST', body: JSON.stringify({ a: 2, b: 2 }) });
	return { sum: await response.json() };
};
