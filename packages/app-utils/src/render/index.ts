import { parse, URLSearchParams } from 'url';
import render_page from './page';
import render_route from './route';
import { ClientManifest, PageComponentManifest, Query, RouteManifest, ServerRouteManifest } from '../types';

function parse_querystring(querystring: string): Query {
	const query = {};
	new URLSearchParams(querystring).forEach((value, key) => {
		query[key] = value || true;
	});
	return query;
}

export async function render({
	only_prerender = false,
	static_dir,
	template,
	manifest,
	client,
	host,
	url,
	dev,
	App,
	load
}: {
	only_prerender: boolean;
	static_dir: string;
	template: string;
	manifest: RouteManifest;
	client: ClientManifest;
	host: string;
	url: string;
	dev: boolean;
	// TODO replace `any`
	App: any; // TODO
	load: (route: PageComponentManifest | ServerRouteManifest) => Promise<any>;
}) {
	const parsed = parse(url);
	const path = parsed.pathname;
	const query = parse_querystring(parsed.query);

	const page = manifest.pages.find(page => page.pattern.test(path));
	const route = manifest.server_routes.find(route => route.pattern.test(path));

	if (route) {
		return render_route({ method: 'GET' /* TODO */, host, path, query, route, load });
	}

	return render_page({ only_prerender, static_dir, template, manifest, client, host, path, query, page, App, load, dev });
}