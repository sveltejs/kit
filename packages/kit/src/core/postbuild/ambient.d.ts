declare module '__SERVER__/index.js' {
	export { Server } from '@sveltejs/kit';
}

declare module '__SERVER__/env.js' {
	export * from '__sveltekit/env';
}
