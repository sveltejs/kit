import { read_all } from '$lib/docs/server';

export async function get() {
	return {
		body: {
			sections: await read_all('faq')
		}
	};
}
