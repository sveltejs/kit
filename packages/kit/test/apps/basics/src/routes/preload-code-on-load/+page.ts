import { browser } from '$app/environment';
import { preloadCode } from '$app/navigation';

export async function load() {
	// #13297: calling `preloadCode` during initial load, before `current.url` is set,
	// used to throw `Failed to construct 'URL': Invalid base URL`
	if (browser) {
		await preloadCode('/preload-code-on-load');
	}
}
