import { prerender } from '$app/server';

export const get_prerendered = prerender(() => 'hello');
