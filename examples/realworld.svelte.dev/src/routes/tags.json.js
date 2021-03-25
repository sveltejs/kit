import * as api from '$lib/api';

export async function get() {
	const { tags } = await api.get('tags');

	// The Conduit API doesn't set a cache-control header on
	// this resource, but it doesn't change frequently enough
	// that it's worth revalidating on every request. Instead,
	// we cache it at the CDN level (`public`) for five
	// minutes (`max-age=300`) to improve performance
	return {
		headers: {
			'cache-control': 'public, max-age=300'
		},
		body: {
			tags: tags.filter((tag) => /^[a-z]+$/i.test(tag))
		}
	};
}
