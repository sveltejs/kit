// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

// TODO: I think we need to do something like this to fix Showcase.svelte but why isn't it working?
declare module '*?static-img' {
	const value: string;
	export default value;
}

export {};
