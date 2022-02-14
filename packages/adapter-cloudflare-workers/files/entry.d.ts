declare module 'APP' {
	export { App } from '@sveltejs/kit';
}

declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';

	export const manifest: SSRManifest;
	export const prerendered: Set<string>;
}

declare abstract class FetchEvent extends Event {
	readonly request: Request;
	respondWith(promise: Response | Promise<Response>): void;
	passThroughOnException(): void;
	waitUntil(promise: Promise<any>): void;
}
