import { read } from '$app/server';
import asset from './server-only.txt?url&no-inline';
import worker from './worker.js?worker&url';

export async function load() {
	return { asset, worker, contents: await read(asset).text() };
}
