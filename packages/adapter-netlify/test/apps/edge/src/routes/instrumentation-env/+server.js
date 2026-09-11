export function GET() {
	return Response.json({ loaded: globalThis.__INSTRUMENTATION_ENV_LOADED__ === true });
}
