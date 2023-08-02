import './shims';
import { init as serverlessInit } from './serverless';

/**
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @returns {import('@netlify/functions').Handler}
 */
export function init(manifest) {
	const handler = serverlessInit(manifest);

	return (event, context) => {
		event.path = manifest._.routes[0].id;
		const targetUrl = new URL(event.rawUrl);
		targetUrl.pathname = event.path;
		event.rawUrl = targetUrl.toString();

		return handler(event, context);
	};
}
