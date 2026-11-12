import { prerender } from '$app/server';

export const prerendered = prerender(() => 'from prerendered asset');
