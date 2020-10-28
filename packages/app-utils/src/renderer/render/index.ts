import { createHash } from 'crypto';
import render_page from './page';
import render_endpoint from './endpoint';
import { EndpointResponse, IncomingRequest, PageResponse, RenderOptions } from '../../types';

function md5(body: string) {
	return createHash('md5').update(body).digest('hex');
}

export async function render(
	request: IncomingRequest,
	options: RenderOptions
): Promise<EndpointResponse | PageResponse | undefined> {
	const { context, headers = {} } = (await options.setup.prepare?.(request.headers)) || {};

	try {
		const response = await (
			render_endpoint(request, context, options) ||
			render_page(request, context, options)
		);

		if (response) {
			// inject ETags for 200 responses
			if (response.status === 200) {
				if (!/(no-store|immutable)/.test(response.headers['cache-control'])) {
					const etag = `"${md5(response.body)}"`;

					if (request.headers['if-none-match'] === etag) {
						return {
							status: 304,
							headers: {},
							body: null
						};
					}

					response.headers['etag'] = etag;
				}
			}

			return {
				status: response.status,
				headers: { ...headers, ...response.headers },
				body: response.body
			};
		}
	} catch (err) {
		return {
			status: 500,
			headers: {},
			body: options.dev ? err.stack : err.message
		};
	}
}