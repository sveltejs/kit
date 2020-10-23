import { createHash } from 'crypto';
import render_page from './page';
import render_route from './route';
import { EndpointResponse, IncomingRequest, PageResponse, RenderOptions } from '../types';

function md5(body) {
	return createHash('md5').update(body).digest('hex');
}

export async function render(
	request: IncomingRequest,
	options: RenderOptions
): Promise<EndpointResponse | PageResponse> {
	const { context, headers = {} } = (await options.setup.prepare?.(request.headers)) || {};

	const response = await (
		render_route(request, context, options) ||
		render_page(request, context, options)
	);

	// inject ETags for 200 responses
	if (response && response.status === 200) {
		if (!/(no-store|immutable)/.test(response.headers['cache-control'])) {
			const etag = `"${md5(response.body)}"`;

			if (request.headers['if-none-match'] === etag) {
				return { status: 304 };
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