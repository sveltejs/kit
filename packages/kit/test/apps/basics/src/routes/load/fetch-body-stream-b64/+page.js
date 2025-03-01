const body_stream_to_buffer = async (body) => {
	let buffer = new Uint8Array();
	const reader = body.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (value != null) {
			const newBuffer = new Uint8Array(buffer.length + value.length);
			newBuffer.set(buffer, 0);
			newBuffer.set(value, buffer.length);
			buffer = newBuffer;
		}
		if (done) break;
	}
	return buffer;
};

export async function load({ fetch }) {
	const res = await fetch('/load/fetch-body-stream-b64/data');

	const l = await fetch('/load/fetch-body-stream-b64/data', {
		body: Uint8Array.from(Array(256).fill(0), (_, i) => i),
		method: 'POST'
	});

	return {
		data: await body_stream_to_buffer(res.body),
		data_long: await body_stream_to_buffer(l.body)
	};
}
