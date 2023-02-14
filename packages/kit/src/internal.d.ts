/** Internal version of $app/paths */
declare module '@sveltejs/kit/paths' {
	export const base: `/${string}`;
	export let assets: `https://${string}` | `http://${string}`;
	export function set_assets(path: string): void;
}
