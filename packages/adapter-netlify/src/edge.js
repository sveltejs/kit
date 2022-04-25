import { Server } from '0SERVER';
import { manifest, prerendered } from 'MANIFEST';

const server = new Server(manifest);
const prefix = `/${manifest.appDir}/`;

/**
 * @param { Request } request
 * @param { any } context
 * @returns { Promise<Response> }
 */
export default function handler(request, context) {
	if (is_static_file(request)) {
		// Static files can skip the handler
		return;
	}

	return server.respond(request, {
		platform: { context },
		getClientAddress() {
			return request.headers.get('x-nf-client-connection-ip');
		}
	});
}

/**
 * @param {Request} request
 */
function is_static_file(request) {
	const url = new URL(request.url);

	// Assets in the app dir
	if (url.pathname.startsWith(prefix)) {
		return true;
	}
	// prerendered pages and index.html files
	const pathname = url.pathname.replace(/\/$/, '');
	let file = pathname.substring(1);

	try {
		file = decodeURIComponent(file);
	} catch (err) {
		// ignore
	}

	return (
		manifest.assets.has(file) ||
		manifest.assets.has(file + '/index.html') ||
		prerendered.has(pathname || '/')
	);
}
