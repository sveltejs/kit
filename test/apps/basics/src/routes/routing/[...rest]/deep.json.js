export function get({ params }) {
	return { body: params.rest.join(',') };
}
