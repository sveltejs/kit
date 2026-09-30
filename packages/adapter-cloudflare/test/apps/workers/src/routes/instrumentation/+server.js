export function GET() {
	// @ts-expect-error test-only state shared with instrumentation
	return new Response(globalThis.instrumentation_env);
}
