export { default as Test } from './Test.svelte';
export * from "./sub/foo";
import * as Utils from "./utils/index";
export { Utils}
// @ts-expect-error
export { X } from '$libre';
