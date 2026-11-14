import { command, query } from '$app/server';

export const runtime = query(() => navigator.userAgent);

let count = 0;

export const increment = command(() => (count += 1));
