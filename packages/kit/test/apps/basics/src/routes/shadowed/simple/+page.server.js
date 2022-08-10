/** @type {import('./$types').Get} */
export function GET({ locals }) {
	return {
		answer: locals.answer
	};
}
