import { json } from '@sveltejs/kit';
import { CAPTURED_AT_MODULE_SCOPE } from '$lib/server/api-client.js';

export function GET() {
	return json({
		captured: CAPTURED_AT_MODULE_SCOPE ?? null,
		live: process.env.MY_BASE_URL ?? null
	});
}
