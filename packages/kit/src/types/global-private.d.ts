declare global {
	const __SVELTEKIT_ADAPTER_NAME__: string;
	const __SVELTEKIT_APP_VERSION_FILE__: string;
	const __SVELTEKIT_APP_VERSION_POLL_INTERVAL__: number;
	const __SVELTEKIT_DEV__: boolean;
	const __SVELTEKIT_EMBEDDED__: boolean;
	/**
	 * This makes the use of specific features visible at both dev and build time, in such a
	 * way that we can error when they are not supported by the target platform
	 */
	var __SVELTEKIT_TRACK__: (label: string) => void;
	var Bun: object;
	var Deno: object;
}

export {};
