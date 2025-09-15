import type { Baz } from '../baz';
export declare const dynamic: () => Promise<typeof import('../Test.svelte')>;
export declare const bar1: import('./foo').Foo;
export declare const bar2: Baz;
export declare const bar3: Baz;
export declare const bar4: import('./foo').Foo;
