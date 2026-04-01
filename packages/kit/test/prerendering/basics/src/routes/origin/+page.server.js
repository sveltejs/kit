export const prerender = true;

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const res = await fetch('/origin/message.json');
	const { message } = await res.json();

	return {
		message
	};
}
