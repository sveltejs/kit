declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';
	export const manifest: SSRManifest;
}

declare module 'MIDDLEWARE' {
	export const config: any;
	export default function middleware(request: Request, context: any): any;
}
