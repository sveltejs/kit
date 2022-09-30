export const prerender = true;

export async function load({ url }) {
	const res = await fetch(new URL('/origin/message.json', url.origin).href);
	const { message } = await res.json();

	return {
		message
	};
}
