// https://vercel.com/docs/concepts/image-optimization

/**
 * @param {string} src
 * @param {number} width
 * @param {{ quality?: number }} [image_options]
 */
export default function loader(src, width, image_options) {
	const url = new URL(src, 'http://n'); // If the base is a relative URL, we need to add a dummy host to the URL

	if (url.pathname === '/_vercel/image') {
		set_param(url, 'w', width);
		if (image_options?.quality) {
			set_param(url, 'q', image_options.quality, false);
		}
	} else {
		url.pathname = '_vercel/image';
		set_param(url, 'url', src);
		set_param(url, 'w', width);
		if (image_options?.quality) {
			set_param(url, 'q', image_options.quality);
		}
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
