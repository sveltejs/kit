import * as layout from "/_app/main/components/layout.svelte";
export { layout };
export { default as ErrorComponent } from "/_app/routes/$error.svelte";

export const components = [
	() => import("/_app/routes/index.svelte"),
	() => import("/_app/routes/crash-module-scope-client.svelte"),
	() => import("/_app/routes/crash-module-scope-server.svelte"),
	() => import("/_app/routes/crash-preload-client.svelte"),
	() => import("/_app/routes/crash-preload-server.svelte"),
	() => import("/_app/routes/crash-clientside.svelte"),
	() => import("/_app/routes/crash-serverside.svelte"),
	() => import("/_app/routes/dynamic-[slug].svelte"),
	() => import("/_app/routes/preload.svelte")
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