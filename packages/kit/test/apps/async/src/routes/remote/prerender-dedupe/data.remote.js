import { prerender } from '$app/server';

let invocations = 0;

// used by two prerendered pages — at build time, this must only execute once,
// so that both pages render the same value
export const counted = prerender(() => ++invocations);
