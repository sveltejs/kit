/**
 * Synchronously returns a `ReadableStream` containing the body of an
 * asynchronously fetched asset.
 * @param {{
 * 	origin: string;
 * 	file: string;
 * 	fetch?: typeof globalThis.fetch;
 * }} options
 * @returns {ReadableStream}
 * @since 2.23.0
 */
export function fetchFile({ origin, file, fetch = globalThis.fetch }) {
	const controller = new AbortController();
	const signal = controller.signal;

	return new ReadableStream({
		async start(controller) {
			try {
				const response = await fetch(`${origin}/${file}`, { signal });
				if (!response.ok) {
					throw new Error(`Failed to fetch ${file}: ${response.status} ${response.statusText}`);
				}

				if (!response.body) {
					controller.close();
					return;
				}

				const reader = response.body.getReader();

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					controller.enqueue(value);
				}

				controller.close();
			} catch (error) {
				controller.error(error);
			}
		},
		cancel(reason) {
			controller.abort(reason);
		}
	});
}
