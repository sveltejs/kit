export function get() {
	const cause = new Error('cause');
	const error = new Error('show yourself, coward');
	error.cause = cause;
	error.circular = error;

	return {
		status: 503,
		body: error
	};
}
