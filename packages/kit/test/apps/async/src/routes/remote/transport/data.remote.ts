import { query } from '$app/server';
import { Foo } from '$lib';

export const greeting = query(() => new Foo('hello from remote function'));
