import type { PlatformProxy, CacheStorage } from 'wrangler';

declare global {
	var __platform_proxy: PlatformProxy;
	var caches: CacheStorage;
}
