export async function load({ fetch }) {
	const res = await fetch('/load/fetch-arraybuffer-b64/data');

	return {
		data: res.arrayBuffer()
	};
}
