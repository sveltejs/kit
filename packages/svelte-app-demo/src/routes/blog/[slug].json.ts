import posts from './_posts';

export function get({ params }) {
	if (params.slug in posts) {
		return {
			body: posts[params.slug]
		};
	}

	return {
		status: 404
	};
}