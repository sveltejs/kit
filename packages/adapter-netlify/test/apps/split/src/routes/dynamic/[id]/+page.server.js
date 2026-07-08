/** @type {import("./$types").PageServerLoad} */
export function load({ params }) {
	return {
		id: params.id
	};
}
