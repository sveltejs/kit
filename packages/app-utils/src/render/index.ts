import { createHash } from 'crypto';
import render_page from './page';
import render_route from './route';
import { ClientManifest, IncomingRequest, Loader, RouteManifest } from '../types';

function md5(body) {
	return createHash('md5').update(body).digest('hex');
}

export async function render(
	request: IncomingRequest,
	options: {
		only_prerender: boolean;
		static_dir: string;
		template: string;
		manifest: RouteManifest;
		client: ClientManifest;
		dev: boolean;
		App: any; // TODO replace `any`
		load: Loader
	}
) {
	const response = await (
		render_route(request, options) ||
		render_page(request, options)
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

	return response;
}