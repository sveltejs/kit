/** Internal version of $app/paths */
declare module '__sveltekit/paths' {
	export let base: '' | `/${string}`;
	export let assets: '' | `https://${string}` | `http://${string}` | '/_svelte_kit_assets';
	export let app_dir: string;
	export let relative: boolean;
	export function reset(): void;
	export function override(paths: { base: string; assets: string }): void;
	export function set_assets(path: string): void;
}
