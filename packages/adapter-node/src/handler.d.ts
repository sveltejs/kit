import type { Handle } from '@sveltejs/kit';

declare global {
	const ORIGIN: string;
	const ADDRESS_HEADER: string;
	const HOST_HEADER: string;
	const PROTOCOL_HEADER: string;
	const XFF_DEPTH_ENV: string;
}

export const handler: Handle;
