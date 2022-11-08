const chunk_size = 50000;
const chunk_count = 100;

let chunk = '';
for (let i = 0; i < chunk_size; i += 1) {
	chunk += String(i % 10);
}

const encoder = new TextEncoder();

export function GET() {
	let i = 0;

	return new Response(
		new ReadableStream({
			pull: (controller) => {
				if (i++ < chunk_count) {
					controller.enqueue(encoder.encode(chunk));
				} else {
					controller.close();
				}
			}
		})
	);
}
