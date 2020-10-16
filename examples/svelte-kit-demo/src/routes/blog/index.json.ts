import posts from './_posts';

export function get() {
	return {
		body: Object.keys(posts).map(slug => ({
			slug,
			...posts[slug]
		}))
	};
}