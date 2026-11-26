import { get_answer } from './data.remote.js';

/** @type {import('./$types').PageLoad} */
export async function load() {
	return { answer: await get_answer() };
}
