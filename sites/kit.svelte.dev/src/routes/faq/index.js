import { read_all } from '$lib/docs';

export function get() {
	return {
		body: {
			sections: read_all('faq')
		}
	};
}
