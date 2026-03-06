export const prerender = true;

export async function load({ fetch }) {
	globalThis.fetch = fetch;
	const res = await fetch('/origin/message.json');
	const { message } = await res.json();

	return {
		message
	};
}
