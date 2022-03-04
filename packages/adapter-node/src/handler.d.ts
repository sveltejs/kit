import type { Handle } from '@sveltejs/kit';

declare global {
	const ORIGIN: string;
	const HOST_HEADER: string;
	const PROTOCOL_HEADER: string;
}

export const handler: Handle;
