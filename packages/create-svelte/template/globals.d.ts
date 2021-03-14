/// <reference types="@sveltejs/kit" />
/// <reference types="vite/client" />

//#region Ensure Svelte file endings have a type for TypeScript
/**
 * These declarations tell TypeScript that we allow import of Svelte files in TS files, e.g.
 * ```js
 * import Component from './Component.svelte';
 * ```
 */
declare module '*.svelte' {
	export { SvelteComponent as default } from 'svelte';
}
//#endregion

//#region Ensure image file endings have a type for TypeScript
/**
 * Tell TypeScript that we allow import of images, e.g.
 * ```html
 * <script lang='ts'>
 * 	import successkid from 'images/successkid.jpg';
 * </script>
 * <img src="{successkid}">
 * ```
 */
declare module '*.(gif|jpg|jpeg|png|svg|webp)' {
	const value: string;
	export = value;
}
//#endregion
