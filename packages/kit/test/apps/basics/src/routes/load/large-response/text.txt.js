const chunk_size = 50000;
const chunk_count = 100;

let chunk = '';
for (let i = 0; i < chunk_size; i += 1) {
	chunk += String(i % 10);
}

export function GET() {
	let i = 0;

	return {
		body: new ReadableStream({
			pull: (controller) => {
				if (i++ < chunk_count) {
					controller.enqueue(chunk);
				} else {
					controller.close();
				}
			}
		})
	};
}
