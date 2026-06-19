declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';
	export const manifest: SSRManifest;
}

declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare const BASE: string;
declare const ENV_PREFIX: string;
declare const ENV_PREFIX_LENGTH: number;
declare const PRECOMPRESS: boolean;
declare const PRERENDERED: Set<string>;
