import qs from 'querystring';
import { createFilter } from '@rollup/pluginutils';
import { Arrayable, ResolvedOptions } from './options';

export type SvelteQueryTypes = 'style' | 'script';

// TODO get the value from vite config
const viteVirtualIdPrefix = '/@id/';

export interface SvelteQuery {
	svelte?: boolean;
	type?: SvelteQueryTypes;
}

export interface SvelteRequest {
	id: string;
	cssId: string;
	filename: string;
	normalizedFilename: string;
	query: SvelteQuery;
	timestamp: number;
	ssr: boolean;
}

function parseToSvelteRequest(
	id: string,
	root: string,
	timestamp: number,
	ssr: boolean
): SvelteRequest {
	let [filename, rawQuery] = id.split('?', 2);
	const query = qs.parse(rawQuery) as SvelteQuery;
	if (query.svelte != null) {
		query.svelte = true;
	}

	if (query.svelte) {
		filename = stripVirtualImportId(filename, query.type);
	}
	const normalizedFilename = normalizePath(filename, root);
	const cssId = createVirtualImportId(normalizedFilename, 'style', timestamp);
	return {
		id,
		cssId,
		filename,
		normalizedFilename,
		query,
		timestamp,
		ssr
	};
}

function stripVirtualImportId(filename: string, type?: SvelteQueryTypes) {
	if (filename.startsWith(viteVirtualIdPrefix)) {
		filename = filename.substring(viteVirtualIdPrefix.length);
	}
	if (type === 'style' && filename.endsWith('.css')) {
		filename = filename.slice(0, -4);
	}
	return filename;
}

function createVirtualImportId(id: string, type: SvelteQueryTypes, timestamp: number) {
	if (type === 'style') {
		id = `${id}.css`;
	}
	// TODO rixo suggested adding another timestamp cachebuster here, test it
	return `${id}?svelte&type=${type}`;
}

function normalizePath(filename: string, root: string) {
	return filename.startsWith(root + '/') ? filename.replace(root, '') : filename;
}

function buildFilter(
	include: Arrayable<string>,
	exclude: Arrayable<string>,
	extensions: string[]
): (svelteRequest: SvelteRequest) => boolean {
	const rollupFilter = createFilter(include, exclude);
	return (svelteRequest) => {
		return (
			(svelteRequest.query && svelteRequest.query.svelte) ||
			(rollupFilter(svelteRequest.filename) &&
				extensions.some((ext) => svelteRequest.filename.endsWith(ext)))
		);
	};
}

export type IdParser = (id: string, ssr: boolean, timestamp?: number) => SvelteRequest | undefined;
export function buildIdParser(options: ResolvedOptions): IdParser {
	const { include, exclude, extensions, root } = options;
	const filter = buildFilter(include, exclude, extensions);
	return (id, ssr, timestamp = Date.now()) => {
		const svelteRequest = parseToSvelteRequest(id, root, timestamp, ssr);
		if (filter(svelteRequest)) {
			return svelteRequest;
		}
	};
}
