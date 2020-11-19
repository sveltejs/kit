declare module 'MANIFEST' {
	import { SvelteComponent } from 'svelte';
	import { Route } from '@sveltejs/app-utils';

	export const components: Array<() => SvelteComponent>;
	export const routes: Route[];
	export const layout: SvelteComponent;
	export const ErrorComponent: SvelteComponent;
}

declare module 'ROOT' {
	import { SvelteComponent } from 'svelte';

	type Constructor<T> = {
		new (...args: any[]): T;
	};

	const root: Constructor<SvelteComponent>;
	export default root;
}
