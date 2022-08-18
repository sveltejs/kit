/** @type {import('./$types').PageData} */
export function load({ params }) {
	return {
		slug: params.slug
	};
}
