import { query } from '$app/server';

export const now = query(() => Date.now());
