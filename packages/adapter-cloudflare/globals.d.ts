import type { PlatformProxy } from 'wrangler';

declare global {
	var __sveltekit_cloudflare_platform: PlatformProxy;
}
