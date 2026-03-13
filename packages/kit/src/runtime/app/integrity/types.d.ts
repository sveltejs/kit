/**
 * Look up the SRI integrity hash for a Vite-processed asset URL.
 * Returns the integrity string (e.g. `"sha384-..."`) during SSR when
 * [`subresourceIntegrity`](https://svelte.dev/docs/kit/configuration#subresourceIntegrity) is enabled,
 * or `undefined` on the client and in dev.
 *
 * ```svelte
 * <script>
 *   import scriptUrl from "./my-script.js?url";
 *   import { integrity } from '$app/integrity';
 * </script>
 *
 * <svelte:head>
 *   <script src="{scriptUrl}" type="module" integrity={integrity(scriptUrl)} crossorigin="anonymous"></script>
 * </svelte:head>
 * ```
 * @param url The asset URL (e.g. from a `?url` import)
 * @since 2.54.0
 */
export function integrity(url: string): string | undefined;
