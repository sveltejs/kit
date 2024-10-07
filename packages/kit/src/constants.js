/**
 * A fake asset path used in `vite dev` and `vite preview`, so that we can
 * serve local assets while verifying that requests are correctly prefixed
 */
export const SVELTE_KIT_ASSETS = '/_svelte_kit_assets';

export const GENERATED_COMMENT = '// this file is generated — do not edit it\n';

export const ENDPOINT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

export const PAGE_METHODS = ['GET', 'POST', 'HEAD'];

/**
 * Placeholders for the hash of the app version.
 * Later replaced in the generateBundle hook to avoid affecting the chunk hash.
 */
export const APP_VERSION_HASH_PLACEHOLDER_BASE = '__SVELTEKIT_APP_VERSION_HASH__';

/**
 * Placeholder for the app version.
 * Later replaced in the generateBundle hook to avoid affecting the chunk hash.
 */
export const APP_VERSION_PLACEHOLDER_BASE = '__SVELTEKIT_APP_VERSION__';
