import { Query, ServerRouteManifest } from '../types';

export default async function render_route({
	method,
	host,
	path,
	query,
	route,
	load
}: {
	method: string;
	host: string;
	path: string;
	query: Query;
	route: ServerRouteManifest;
	load: (route: ServerRouteManifest) => Promise<any>; // TODO
}) {
	const mod = await load(route);
	const handler = mod[method === 'DELETE' ? 'del' : method.toLowerCase()];

	const session = {}; // TODO

	if (handler) {
		const params = {};
		const match = route.pattern.exec(path);
		route.params.forEach((name, i) => {
			params[name] = match[i + 1]
		});

		try {
			let {
				status = 200,
				body,
				headers = {}
			} = await handler({
				host,
				path,
				query,
				params
			}, session);

			if (typeof body === 'object' && !('Content-Type' in headers) || headers['Content-Type'] === 'application/json') {
				headers = { ...headers, 'Content-Type': 'application/json' };
				body = JSON.stringify(body);
			}

			return { status, body, headers };
		} catch (err) {
			return {
				status: 500,
				body: err.message
			};
		}
	} else {
		return {
			status: 501,
			body: `${method} is not implemented for ${path}`
		};
	}
}