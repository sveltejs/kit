export async function load({ fetch }) {
	const res = await fetch('/load/fetch-arraybuffer-b64/data');

	const l = await fetch('/load/fetch-arraybuffer-b64/data', {
		body: Uint8Array.from(Array(256).fill(0), (_, i) => i),
		method: 'POST'
	});

	return {
		data: await res.arrayBuffer(),
		data_long: await l.arrayBuffer()
	};
}
