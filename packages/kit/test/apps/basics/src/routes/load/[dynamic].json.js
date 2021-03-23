export function get({ params }) {
	return {
		body: {
			name: params.dynamic
		}
	};
}
