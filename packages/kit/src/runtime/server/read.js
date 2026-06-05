/**
 * Wrap the `read` function to handle `MaybePromise<ReadableStream>`
 * and ensure the public API stays synchronous
 * @param {NonNullable<import('@sveltejs/kit').ServerInitOptions['read']>} read
 * @returns {(path: string) => ReadableStream}
 */
export function create_synchronous_read(read) {
	return (file) => {
		const result = read(file);
		if (result instanceof ReadableStream) {
			return result;
		} else {
			return new ReadableStream({
				async start(controller) {
					try {
						const stream = await Promise.resolve(result);
						if (!stream) {
							controller.close();
							return;
						}

						const reader = stream.getReader();

						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							controller.enqueue(value);
						}

						controller.close();
					} catch (error) {
						// TODO: we should throw here even if the user doesn't try to read the response body
						controller.error(error);
					}
				}
			});
		}
	};
}
