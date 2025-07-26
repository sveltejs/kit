import { query } from '$app/server';

export const external_not_accessible = query(async () => 'external failure');
