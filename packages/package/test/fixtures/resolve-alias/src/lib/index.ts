export { default as Test } from '$lib/Test.svelte';
export * from '$lib/sub/foo';
export type * from '$lib/sub/bar';
import * as Utils from '$lib/utils/index';
export { Utils };
import baz1, { baz } from '$lib/baz';
import { type Baz } from '$lib/baz';
import baz2, { type Baz as Bz } from '$lib/baz';
export { baz, baz1, baz2, type Baz, type Bz };
// @ts-expect-error
export { X } from '$libre';
