import { prerendered, prerendered_entries } from '../prerender.remote';

export async function load() {
	const [r1, r2, r3, r4] = await Promise.all([
		prerendered_entries('a'),
		prerendered_entries('c'),
		prerendered_entries('中文'),
		prerendered()
	]);

	return {
		r1,
		r2,
		r3,
		r4
	};
}
