const chunk_size = 50000;
const chunk_count = 100;

let chunk = 'STARTCHUNK';
for (let i = 0; i < chunk_size; i += 1) {
	chunk += String(i % 10);
}
chunk += 'ENDCHUNK';

export function get() {
	let i = 0;

	return {
		body: new ReadableStream({
			pull: (controller) => {
				if (i++ < chunk_count) {
					console.log('pulling');
					controller.enqueue(chunk);
				} else {
					controller.enqueue('END');
					controller.close();
				}
			}
		})
	};
}
