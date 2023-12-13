export function load({ url }) {
	const invalidate_all = url.searchParams.get('invalidate_all') === 'true';
	return {
		invalidate_all
	};
}

export const actions = {
	default: () => {}
};
