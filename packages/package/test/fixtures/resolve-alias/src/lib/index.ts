export { default as Test } from '$lib/Test.svelte';
export * from '$lib/sub/foo';
export type * from '$lib/sub/bar';
import * as Utils from '$lib/utils/index';
export { Utils };
// @ts-expect-error
export { X } from '$libre';
