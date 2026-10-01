export function load() {
	return {
		eager: 'eager',
		streamed: Promise.reject(new Error('delayed rejection'))
	};
}
