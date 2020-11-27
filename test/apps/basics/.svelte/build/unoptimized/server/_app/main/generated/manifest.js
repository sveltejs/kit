import * as layout from "../components/layout.js";
export { layout };
export { default as ErrorComponent } from "../../routes/$error.js";

export const components = [
	() => import("../../routes/index.js"),
	() => import("../../routes/crash-module-scope-client.js"),
	() => import("../../routes/crash-module-scope-server.js"),
	() => import("../../routes/crash-preload-client.js"),
	() => import("../../routes/crash-preload-server.js"),
	() => import("../../routes/crash-clientside.js"),
	() => import("../../routes/crash-serverside.js"),
	() => import("../../routes/dynamic-[slug].js"),
	() => import("../../routes/preload.js")
];

export const routes = (d => [
	{
		// index.svelte
		pattern: /^\/$/,
		parts: [
			{ i: 0 }
		]
	},

	{
		// crash-module-scope-client.svelte
		pattern: /^\/crash-module-scope-client\/?$/,
		parts: [
			{ i: 1 }
		]
	},

	{
		// crash-module-scope-server.svelte
		pattern: /^\/crash-module-scope-server\/?$/,
		parts: [
			{ i: 2 }
		]
	},

	{
		// crash-preload-client.svelte
		pattern: /^\/crash-preload-client\/?$/,
		parts: [
			{ i: 3 }
		]
	},

	{
		// crash-preload-server.svelte
		pattern: /^\/crash-preload-server\/?$/,
		parts: [
			{ i: 4 }
		]
	},

	{
		// crash-clientside.svelte
		pattern: /^\/crash-clientside\/?$/,
		parts: [
			{ i: 5 }
		]
	},

	{
		// crash-serverside.svelte
		pattern: /^\/crash-serverside\/?$/,
		parts: [
			{ i: 6 }
		]
	},

	{
		// dynamic-[slug].svelte
		pattern: /^\/dynamic-([^/]+?)\/?$/,
		parts: [
			{ i: 7, params: match => ({ slug: d(match[1]) }) }
		]
	},

	{
		// preload.svelte
		pattern: /^\/preload\/?$/,
		parts: [
			{ i: 8 }
		]
	}
])(decodeURIComponent);