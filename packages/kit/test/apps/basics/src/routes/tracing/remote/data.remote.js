import { query } from '$app/server';

export const get_message = query(() => 'hello from a traced remote function');
