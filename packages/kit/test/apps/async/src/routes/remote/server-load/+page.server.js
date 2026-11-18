import { get_server_load_data } from './data.remote.js';

export async function load() {
	const { message } = await get_server_load_data();

	return { message };
}
