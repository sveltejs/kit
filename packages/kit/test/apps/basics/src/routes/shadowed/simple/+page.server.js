/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	return {
		answer: locals.answer
	};
}
