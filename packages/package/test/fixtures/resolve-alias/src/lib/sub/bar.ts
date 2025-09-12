import { baz } from '$lib/baz';
import { foo } from '$lib/sub/foo';
import type { Baz } from '$lib/baz';
import {
	// some comment
	foo as $foo
} from '$lib/sub/foo';

export const dynamic = () => import('$lib/Test.svelte');
export const bar1 = foo;
export const bar2 = baz;
export const bar3: Baz = { baz: 'bar' };
export const bar4 = $foo;
