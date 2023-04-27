import { set_param, relative_url } from './utils';

// https://docs.netlify.com/large-media/transform-images/

/** @type {import("types").GetURL<{ nf_resize?: 'fit' | 'smartcrop' }>} */
export function getURL({ src, width, options }) {
	const url = new URL(src, 'http://n'); // If the base is a relative URL, we need to add a dummy host to the URL
	url.searchParams.delete('h');
	set_param(url, 'w', width);
	set_param(url, 'nf_resize', options?.nf_resize ?? 'fit', false);

	return src === url.href ? url.href : relative_url(url);
}
