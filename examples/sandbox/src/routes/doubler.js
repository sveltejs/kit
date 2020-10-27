export function post({ body }) {
	const num = +body.get('num');

	return {
		body: {
			original: num,
			doubled: num * 2
		}
	};
}