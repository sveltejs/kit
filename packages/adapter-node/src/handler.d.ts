import type { Handle } from '@sveltejs/kit';

declare global {
	const ORIGIN: string;
	const ADDRESS_HEADER: string;
	const HOST_HEADER: string;
	const PROTOCOL_HEADER: string;
	const X_FORWARDED_FOR_INDEX: number;
}

export const handler: Handle;
