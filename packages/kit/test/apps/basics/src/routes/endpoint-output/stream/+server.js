import { createHash, randomBytes } from 'node:crypto';

/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	const data = randomBytes(1024 * 256);
	const digest = createHash('sha256').update(data).digest('base64url');

	let length = 0;

	return new Response(
		new ReadableStream(
			{
				pull(controller) {
					const offset = data.byteOffset + length;
					const chunk =
						data.byteLength - length > controller.desiredSize
							? new Uint8Array(data.buffer, offset, controller.desiredSize)
							: new Uint8Array(data.buffer, offset);

					controller.enqueue(chunk);

					length += chunk.byteLength;

					if (length >= data.byteLength) {
						controller.close();
					}
				}
			},
			{ highWaterMark: 1024 * 16 }
		),
		{
			headers: {
				'content-type': 'application/octet-stream',
				digest: `sha-256=${digest}`
			}
		}
	);
}
