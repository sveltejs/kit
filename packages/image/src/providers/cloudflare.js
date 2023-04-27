import { relative_url } from './utils';

// (https://<ZONE>)/cdn-cgi/image/<OPTIONS>/<SOURCE-IMAGE>

/** @type {import("types").GetURL<{ quality?: number, dpr?: number; fit?: string } & Record<string, any>>} */
export function getURL({ src, width, options = {} }) {
	const url = new URL(src, 'http://n'); // If the base is a relative URL, we need to add a dummy host to the URL
	if (url.pathname.startsWith('/cdn-cgi/image/')) {
		const parts = url.pathname.split('/');
		const params = parts[3].split(',').reduce((acc, cur) => {
			const [key, value] = cur.split('=');
			acc[key] = value;
			return acc;
		}, /** @type {Record<String, any>} */ ({}));

		url.pathname = `/cdn-cgi/image/${to_url_segment({ ...params, ...options, width })}/${
			src.startsWith('/') ? src.slice(1) : src
		}`;
	} else {
		url.pathname = `/cdn-cgi/image/${to_url_segment({ ...options, width })}/${
			src.startsWith('/') ? src.slice(1) : src
		}`;
	}
	return url.href === src ? url.href : relative_url(url);
}

/** @param {Record<string, any>} options */
function to_url_segment(options) {
	return Object.entries(options)
		.map(([key, value]) => `${key}=${value}`)
		.join(',');
}
