declare global {
	const __SVELTEKIT_ADAPTER_NAME__: string;
	const __SVELTEKIT_APP_VERSION_FILE__: string;
	const __SVELTEKIT_APP_VERSION_POLL_INTERVAL__: number;
	const __SVELTEKIT_DEV__: boolean;
	const __SVELTEKIT_EMBEDDED__: boolean;
	const __SVELTEKIT_ENABLE_FINE_GRAINED_PARAMS_INVALIDATION__: boolean;
	var Bun: object;
	var Deno: object;
}

export {};
