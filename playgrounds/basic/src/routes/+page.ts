import { add } from '$lib/foo.remote';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	return { sum: await add(1, 2) };
};

// export const prerender = true;
