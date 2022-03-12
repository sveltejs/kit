export function get() {
	return {
		body: {
			message: 'A custom error message'
		},
		status: 451
	};
}
