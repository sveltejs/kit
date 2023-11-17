// https://vercel.com/docs/concepts/image-optimization

/**
 * @param {string} src
 * @param {number} width
 * @param {{ domains: string[] }} loader_options
 * @param {{ quality?: number }} [image_options]
 */
export default function loader(src, width, loader_options, image_options) {
	const url = new URL(src, 'http://n'); // If the base is a relative URL, we need to add a dummy host to the URL

	if (url.href === src) {
		// There's remotePatterns, too, but we don't implement it here to save bytes - people shouldn't be configuring this
		// and then use it with the wrong URLs, anyway
		if (!loader_options.domains.some((domain) => url.hostname === domain)) {
			return src;
		}
	}

	if (url.pathname === '/_vercel/image') {
		set_param(url, 'w', width);
		set_param(url, 'q', image_options?.quality ?? 100, false);
	} else {
		url.pathname = '_vercel/image';
		set_param(url, 'url', src);
		set_param(url, 'w', width);
		set_param(url, 'q', image_options?.quality ?? 100);
	}
	return src === url.href ? url.href : relative_url(url);
}

/**
 * @param {URL} url
 */
function relative_url(url) {
	const { pathname, search } = url;
	return `${pathname}${search}`;
}
/**
 * @param {URL} url
 * @param {string} param
 * @param {any} value
 * @param {boolean} [override]
 */
function set_param(url, param, value, override = true) {
	if (value === undefined) {
		return;
	}

	if (value === null) {
		if (override || url.searchParams.has(param)) {
			url.searchParams.delete(param);
		}
	} else {
		if (override || !url.searchParams.has(param)) {
			url.searchParams.set(param, value);
		}
	}
}
