import { json } from '@sveltejs/kit';

export function GET() {
	// @ts-expect-error test-only state set by instrumentation
	return json({ value: globalThis.instrumentation_env });
}
