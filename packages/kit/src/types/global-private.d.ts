import { SvelteKitPayload } from 'types';

declare global {
	const __SVELTEKIT_ADAPTER_NAME__: string;
	const __SVELTEKIT_APP_DIR__: string;
	const __SVELTEKIT_APP_VERSION__: string;
	const __SVELTEKIT_APP_VERSION_FILE__: string;
	const __SVELTEKIT_APP_VERSION_POLL_INTERVAL__: number;
	/** True if version checks are enabled (i.e. `bundleStrategy !== 'inline'`) */
	const __SVELTEKIT_APP_VERSION_CHECKS_ENABLED__: boolean;
	/**
	 * True if the user ran `vite dev`. This is different from `esm-env` because
	 * it is influenced by `NODE_ENV` which can still be true during `vite preview`
	 */
	const __SVELTEKIT_DEV__: boolean;
	const __SVELTEKIT_EMBEDDED__: boolean;
	const __SVELTEKIT_PATHS_ASSETS__: string;
	const __SVELTEKIT_PATHS_BASE__: string;
	const __SVELTEKIT_PATHS_RELATIVE__: boolean;
	/** True if `config.tracing.server` is `true` */
	const __SVELTEKIT_SERVER_TRACING_ENABLED__: boolean;
	/** True if `config.experimental.forkPreloads` is `true` */
	const __SVELTEKIT_FORK_PRELOADS__: boolean;
	/** True if `config.router.resolution === 'client'` */
	const __SVELTEKIT_CLIENT_ROUTING__: boolean;
	/** True if `config.router.type === 'hash'` */
	const __SVELTEKIT_HASH_ROUTING__: boolean;
	/**
	 * True if any node in the manifest has a server load function.
	 * Used for treeshaking server load code from client bundles when no server loads exist.
	 */
	const __SVELTEKIT_HAS_SERVER_LOAD__: boolean;
	/**
	 * True if any node in the manifest has a universal load function.
	 * Used for treeshaking universal load code from client bundles when no universal loads exist.
	 */
	const __SVELTEKIT_HAS_UNIVERSAL_LOAD__: boolean;
	/**
	 * The `__sveltekit_abc123` object in the init `<script>`.
	 * Should only be used when bundleStrategy !== 'inline' to avoid SvelteKit runtime changing on every build, preventing cacheability.
	 */
	const __SVELTEKIT_PAYLOAD__: SvelteKitPayload;
	/**
	 * Whether the `experimental.async` flag is applied
	 */
	const __SVELTEKIT_SUPPORTS_ASYNC__: boolean;
	/**
	 * Manifest data placeholders used by `$app/manifest`. During build, these
	 * are bare identifiers (fake globals) that the bundler leaves as unresolved
	 * references. They are replaced with real values by scanning the output
	 * chunks after each build completes.
	 */
	const __SVELTEKIT_MANIFEST_IMMUTABLE__: string[];
	const __SVELTEKIT_MANIFEST_ASSETS__: string[];
	const __SVELTEKIT_MANIFEST_PRERENDERED__: string[];
	const __SVELTEKIT_MANIFEST_ROUTES__: Array<{ id: string }>;
	/**
	 * This makes the use of specific features visible at both dev and build time, in such a
	 * way that we can error when they are not supported by the target platform.
	 *
	 * During dev, `globalThis.__SVELTEKIT_TRACK__` is a function that grabs the current `event`
	 * and route `config` (from an AsyncLocalStorage instance) and calls the relevant `supports`
	 * function on the adapter (e.g. `adapter.supports.read(...)`).
	 *
	 * At build time, if the function containing the `__SVELTEKIT_TRACK__` call is untreeshaken,
	 * we locate it in the `renderChunk` build hook and a) make a note of the chunk that contains
	 * it and b) replace it with a comment. Later, we can use this information to establish
	 * which routes use which feature, and use the same `adapter.supports.read(...)` function
	 * to throw an error if the feature would fail in production.
	 */
	var __SVELTEKIT_TRACK__: (label: string) => void;
	var Bun: object;
	var Deno: object;
}

export {};
