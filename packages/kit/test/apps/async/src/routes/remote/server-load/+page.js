import { get_universal_load_data } from './data.remote.js';

export async function load({ data }) {
	return { ...data, universal: await get_universal_load_data() };
}
