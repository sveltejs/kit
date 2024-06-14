import { dev } from '$app/environment';
import { read } from '$app/server';
import auto from './auto.txt';
import url from './url.txt?url';

/** @type {Record<string, { default: string }>} */
const glob = import.meta.glob('../../../../read-file-test/**', {
	query: '?url',
	eager: true
});

export async function load() {
	if (!dev && !auto.startsWith('data:')) {
		throw new Error('expected auto.txt to be inlined');
	}

	return {
		auto: await read(auto).text(),
		url: await read(url).text(),
		glob: await read(Object.values(glob)[0].default).text()
	};
}
