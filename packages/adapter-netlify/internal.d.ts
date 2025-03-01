declare module '0SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare module 'SERVER_INIT' {
	export { initServer } from '@sveltejs/kit';
}

declare module 'MIDDLEWARE' {
	export default function (req: Request, context: any): any;
}

declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';

	export const manifest: SSRManifest;
}
