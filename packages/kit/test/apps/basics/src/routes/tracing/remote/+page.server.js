import { get_message } from './data.remote.js';

export async function load() {
	return { message: await get_message() };
}
