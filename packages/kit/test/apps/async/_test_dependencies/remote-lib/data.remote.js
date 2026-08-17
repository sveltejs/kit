import { query } from '$app/server';

export const lib_echo = query('unchecked', (value) => `lib says ${value}`);
