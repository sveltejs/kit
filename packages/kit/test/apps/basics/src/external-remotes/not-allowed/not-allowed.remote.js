import { query } from '$app/server';

export const external_not_allowed = query(async () => 'external failure');
