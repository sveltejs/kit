/**
 * @typedef StreamFileContentOptions
 * @property {typeof fetch} fetch The fetch function to use for fetching the asset.
 * @property {string | URL} url The URL of the asset to fetch.
 * @property {AbortController} [controller] An optional AbortController to cancel the fetch operation.
 */

/**
 * synchronously returns a ReadableStream containing the body of an asynchronously fetched asset
 * original use case: adapters' server read implementation
 * @param {StreamFileContentOptions } options
 * @returns {ReadableStream}
 */
export function streamFileContent(options) {
	const { fetch, url, controller: abortController = new AbortController() } = options;

	return new ReadableStream({
		async start(controller) {
			try {
				const response = await fetch(new URL(url), { signal: abortController.signal });
				if (!response.ok) {
					throw new Error(`Failed to fetch (${response.status} - ${response.statusText})`);
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
			abortController.abort(reason);
		}
	});
}
