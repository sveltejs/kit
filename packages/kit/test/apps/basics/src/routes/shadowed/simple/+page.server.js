/** @type {import('./$types').GET} */
export function GET({ locals }) {
	return {
		answer: locals.answer
	};
}
