import { RouteManifest, PageManifest, EndpointManifest } from '../../types';

const array_item_delimiter = ',';

function map_pages(pages: PageManifest[]) {
	return pages
		.map(({ pattern, parts: json_parts }) => {
			const parts = JSON.stringify(json_parts);
			return `{ pattern: ${pattern}, parts: ${parts} }`;
		})
		.join(array_item_delimiter);
}

function map_endpoints(endpoints: EndpointManifest[]) {
	return endpoints
		.map(({ name, pattern, file, params: json_params }) => {
			const params = JSON.stringify(json_params);
			return `{ name: '${name}', pattern: ${pattern}, file: '${file}', params: ${params} }`;
		})
		.join(array_item_delimiter);
}

export function generate_manifest_module(manifest: RouteManifest) {
	const strings: (keyof RouteManifest)[] = ['layout', 'error', 'components'];
	const [layout, error, components] = strings.map((b) => JSON.stringify(manifest[b]));
	const pages = map_pages(manifest.pages);
	const endpoints = map_endpoints(manifest.endpoints);

	return `
module.exports = {
  layout: ${layout},
  error: ${error},
  components: ${components},
  pages: [${pages}],
  endpoints: [${endpoints}]
};`
		.replace(/^\t/gm, '')
		.trim();
}
