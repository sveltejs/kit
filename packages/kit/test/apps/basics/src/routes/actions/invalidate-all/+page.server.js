/** @type {import('./$types').PageServerLoad} */
export function load({ url }) {
	const invalidate_all = url.searchParams.get('invalidate_all') === 'true';
	return {
		invalidate_all
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: () => {}
};
