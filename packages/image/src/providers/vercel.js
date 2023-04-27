import { set_param, relative_url } from './utils';

// https://vercel.com/docs/concepts/image-optimization

/** @type {import("types").GetURL<{ quality?: number }>} */
export function getURL({ src, width, options }) {
	const url = new URL(src, 'http://n'); // If the base is a relative URL, we need to add a dummy host to the URL
	if (url.pathname === '/_vercel/image') {
		set_param(url, 'w', width);
		set_param(url, 'q', options?.quality ?? 75, false);
	} else {
		url.pathname = `/_vercel/image`;
		set_param(url, 'url', src);
		set_param(url, 'w', width);
		set_param(url, 'q', options?.quality ?? 75);
	}
	return src === url.href ? url.href : relative_url(url);
}
