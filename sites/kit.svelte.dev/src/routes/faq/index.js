import { read_all } from '$lib/docs';

export async function get() {
	return {
		body: {
			sections: await read_all('faq')
		}
	};
}
