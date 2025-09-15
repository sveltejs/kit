import { baz } from '../baz';
import { foo } from './foo';
import {
  // some comment
  foo as $foo,
} from "./foo";
export const dynamic = () => import('../Test.svelte');
export const bar1 = foo;
export const bar2 = baz;
export const bar3 = { baz: "bar" };
export const bar4 = $foo;
