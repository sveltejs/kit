import { asset, resolve } from '$app/paths';
import { query } from '$app/server';

export const get_paths = query(() => ({
	resolved: resolve('/remote/query-resolve'),
	asset: asset('robots.txt')
}));
