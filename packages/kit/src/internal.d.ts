/** Internal version of $app/environment */
declare module '__sveltekit/environment' {
	export const building: boolean;
	export const version: string;
	export function set_building(): void;
}

/** Internal version of $app/paths */
declare module '__sveltekit/paths' {
	export const base: string;
	export let assets: `https://${string}` | `http://${string}`;
	export function reset(): void;
	export function set_base(path: string): void;
	export function set_assets(path: string): void;
}
