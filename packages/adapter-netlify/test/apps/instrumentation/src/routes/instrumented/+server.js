export function GET() {
	return new Response(String(globalThis.__INSTRUMENTATION_RAN__ === true));
}
