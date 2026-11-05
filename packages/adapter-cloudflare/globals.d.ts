import type { PlatformProxy } from '@cloudflare/platform-proxy';

declare global {
	var __sveltekit_cloudflare_platform: PlatformProxy | undefined;
	var __sveltekit_cloudflare_platform_setup:
		| { servers: number; proxy: Promise<PlatformProxy> }
		| undefined;
}
