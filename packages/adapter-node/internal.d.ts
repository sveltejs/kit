declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';
	export const manifest: SSRManifest;
}

declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare global {
	const ENV_PREFIX: string;
	const PRECOMPRESS: boolean;
}

export {};
