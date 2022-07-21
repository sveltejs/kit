export async function GET({ url }) {
	const res = await fetch(new URL('/origin/message.json', url.origin).href);
	const { message } = await res.json();

	return {
		body: {
			message
		}
	};
}
