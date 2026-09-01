export function GET() {
	return Response.json({
		ran: globalThis.__INSTRUMENTATION_RAN__ === true,
		env: globalThis.__INSTRUMENTATION_ENV_LOADED__ === true
	});
}
