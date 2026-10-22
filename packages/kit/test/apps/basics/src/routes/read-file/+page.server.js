import { dev } from '$app/env';
import { read } from '$app/server';
import auto from './[auto].txt';
import url from './[url].txt?url';
import styles from './[styles].css?url';
import no_inline from './[url].txt?url&no-inline';
import external_no_inline from '../../../../read-file-test/[file].txt?url&no-inline';

/** @type {Record<string, { default: string }>} */
const local_glob = import.meta.glob('./assets/**', {
	query: '?url',
	eager: true
});

/** @type {Record<string, { default: string }>} */
const external_glob = import.meta.glob('../../../../read-file-test/**', {
	query: '?url',
	eager: true
});

export async function load() {
	if (!dev && !auto.startsWith('data:')) {
		throw new Error('expected auto.txt to be inlined');
	}

	const response = read(no_inline);

	return {
		auto: await read(auto).text(),
		url: await read(url).text(),
		no_inline: await response.text(),
		fragment: await read(`${no_inline}#fragment`).text(),
		query_and_fragment: await read(`${no_inline}${dev ? '&' : '?'}custom=value#fragment`).text(),
		content_type: response.headers.get('content-type'),
		external_no_inline: await read(external_no_inline).text(),
		styles: await read(styles).text(),
		local_glob: await read(local_glob['./assets/[file].txt'].default).text(),
		external_glob: await read(Object.values(external_glob)[0].default).text(),
		svg: await read(local_glob['./assets/icon.svg'].default).text()
	};
}
