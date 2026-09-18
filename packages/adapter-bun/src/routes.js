import { assets, redirects, server_assets as server_files } from '#@sveltejs/adapter-bun';
import {
	client_asset,
	prerendered_asset,
	prerendered_page,
	prerendered_redirect,
	server_asset
} from './routes-util.js';

const helpers = { client_asset, prerendered_asset, prerendered_page };

// reversed because Object.fromEntries keeps the last duplicate: the first generated
// entry for a path must win so exact files beat aliases, like sirv's lookup order
export const routes = Object.fromEntries(
	[
		...assets.flatMap(([helper, url, file, meta]) => helpers[helper](url, file, meta)),
		...redirects.flatMap(([url, status, location]) => prerendered_redirect(url, status, location))
	].reverse()
);

export const server_assets = new Map(
	server_files.map(([file, embedded]) => [file, server_asset(file, embedded)])
);
