import { reroute } from '__HOOKS__';
import { rewrite, next } from '@vercel/edge';

/**
 * @param {Request} request
 * @returns {Response}
 */
export default function middleware(request) {
	const url = new URL(request.url);

	const is_data_request = has_data_suffix(url.pathname);
	if (is_data_request) {
		url.pathname =
			strip_data_suffix(url.pathname) +
				(url.searchParams.get(TRAILING_SLASH_PARAM) === '1' ? '/' : '') || '/';
		url.searchParams.delete(TRAILING_SLASH_PARAM);
		url.searchParams.delete(INVALIDATED_PARAM);
	}

	const pathname = reroute({ url });

	if (pathname) {
		const new_url = new URL(request.url);
		new_url.pathname = is_data_request ? add_data_suffix(pathname) : pathname;
		return rewrite(new_url);
	}

	return next(request);
}

// These constants/functions are duplicated in kit and adapter-netlify

const INVALIDATED_PARAM = 'x-sveltekit-invalidated';

const TRAILING_SLASH_PARAM = 'x-sveltekit-trailing-slash';

const DATA_SUFFIX = '/__data.json';
const HTML_DATA_SUFFIX = '.html__data.json';

/** @param {string} pathname */
function has_data_suffix(pathname) {
	return pathname.endsWith(DATA_SUFFIX) || pathname.endsWith(HTML_DATA_SUFFIX);
}

/** @param {string} pathname */
function add_data_suffix(pathname) {
	if (pathname.endsWith('.html')) return pathname.replace(/\.html$/, HTML_DATA_SUFFIX);
	return pathname.replace(/\/$/, '') + DATA_SUFFIX;
}

/** @param {string} pathname */
function strip_data_suffix(pathname) {
	if (pathname.endsWith(HTML_DATA_SUFFIX)) {
		return pathname.slice(0, -HTML_DATA_SUFFIX.length) + '.html';
	}

	return pathname.slice(0, -DATA_SUFFIX.length);
}
