import { query, read } from '$app/server';
import asset from './asset.txt?url&no-inline';

export const get_text = query(async () => {
	return await read(asset).text();
});
