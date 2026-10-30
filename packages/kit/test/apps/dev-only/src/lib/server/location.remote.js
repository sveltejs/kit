import { query } from '$app/server';

export const getMessage = query(async () => 'hello');
