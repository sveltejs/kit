import { read_all } from '$lib/docs/server';

export async function load() {
	return {
		sections: await read_all('faq')
	};
}
