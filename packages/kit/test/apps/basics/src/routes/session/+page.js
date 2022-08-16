/** @type {import('@sveltejs/kit').Load} */
export function load({ session }) {
	return {
		answer: session.answer
	};
}
