import { prerendered, prerendered_entries } from './prerender.remote';

export const prerender = true;

export async function load() {
	const [r1, r2, r3] = await Promise.all([
		prerendered_entries('a'),
		prerendered_entries('c'),
		prerendered()
	]);

	return {
		r1,
		r2,
		r3
	};
}
