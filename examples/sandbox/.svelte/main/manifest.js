export { default as Layout } from "/_app/main/components/layout.svelte";
export { default as ErrorComponent } from "/_app/main/components/error.svelte";

export const components = [
	() => import("/_app/routes/index.svelte")
];

export const routes = [
	{
		// index.svelte
		pattern: /^\/$/,
		parts: [
			{ i: 0 }
		]
	}
];