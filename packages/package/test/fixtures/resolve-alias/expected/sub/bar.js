import { baz } from '../baz';
import { foo } from './foo';
export const dynamic = () => import('../Test.svelte');
export const bar1 = foo;
export const bar2 = baz;
