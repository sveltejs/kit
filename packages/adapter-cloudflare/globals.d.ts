import type { PlatformProxy } from 'wrangler';

declare global {
	var __platform_proxy: PlatformProxy;
}
