import { baz } from '$lib/baz';
import { foo } from '$lib/sub/foo';

export const dynamic = () => import('$lib/Test.svelte');
export const bar1 = foo;
export const bar2 = baz;
