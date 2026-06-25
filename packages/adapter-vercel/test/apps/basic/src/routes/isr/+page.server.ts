export const config = {
	isr: {
		expiration: 60
	}
};

export function load() {
	return {
		rendered_at: Date.now()
	};
}
