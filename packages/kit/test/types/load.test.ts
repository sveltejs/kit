import Kit, { Deferred } from '@sveltejs/kit';

// Test: Return types inferred correctly and transformed into a union
type LoadReturn1 = { success: true } | { message: Promise<string> };

let result1: Kit.AwaitedProperties<LoadReturn1> = null as any;
result1.message = '';
result1.success = true;
// @ts-expect-error - cannot both be present at the same time
result1 = { message: '', success: true };

// Test: Return types keep promise for Deferred
type LoadReturn2 = { success: true } | Deferred<{ message: Promise<string>; eager: true }>;

let result2: Kit.AwaitedProperties<LoadReturn2> = null as any;
result2.message = Promise.resolve('');
result2.eager = true;
result2.success = true;
// @ts-expect-error - cannot both be present at the same time
result2 = { message: '', success: true };
