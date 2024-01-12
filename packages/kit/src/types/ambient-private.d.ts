/** Internal version of $app/environment */
declare module '__sveltekit/environment' {
	/**
	 * SvelteKit analyses your app during the `build` step by running it. During this process, `building` is `true`. This also applies during prerendering.
	 */
	export const building: boolean;
	/**
	 * True during prerendering, false otherwise.
	 */
	export const prerendering: boolean;
	/**
	 * The value of `config.kit.version.name`.
	 */
	export const version: string;
	export function set_building(): void;
	export function set_prerendering(): void;
}

/** Internal version of $app/paths */
declare module '__sveltekit/paths' {
	/**
	 * A string that matches [`config.kit.paths.base`](https://kit.svelte.dev/docs/configuration#paths).
	 *
	 * Example usage: `<a href="{base}/your-page">Link</a>`
	 */
	export let base: '' | `/${string}`;
	/**
	 * An absolute path that matches [`config.kit.paths.assets`](https://kit.svelte.dev/docs/configuration#paths).
	 *
	 * > If a value for `config.kit.paths.assets` is specified, it will be replaced with `'/_svelte_kit_assets'` during `vite dev` or `vite preview`, since the assets don't yet live at their eventual URL.
	 */
	export let assets: '' | `https://${string}` | `http://${string}` | '/_svelte_kit_assets';
	export let relative: boolean;
	export function reset(): void;
	export function override(paths: { base: string; assets: string }): void;
	export function set_assets(path: string): void;
}
