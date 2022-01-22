export function get() {
	return {
		headers: {
			'set-cookie': ['answer=42; HttpOnly', 'problem=comma, separated, values; HttpOnly']
		}
	};
}
