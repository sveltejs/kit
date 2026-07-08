export const config = {
	isr: {
		expiration: 60
	}
};

export function load({ params }) {
	return {
		slug: params.slug,
		rendered_at: Date.now()
	};
}
