import { resolve } from '$app/paths';
import { query } from '$app/server';

export const resolved_path = query(() => resolve('login'));
