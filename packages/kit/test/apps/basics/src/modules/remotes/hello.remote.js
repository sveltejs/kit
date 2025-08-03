import { query } from '$app/server';

export const get_hello_from_modules = query(() => 'hello from $modules');