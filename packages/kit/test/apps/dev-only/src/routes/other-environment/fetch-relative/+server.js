export async function GET() {
	try {
		await fetch('/other-environment/endpoint');
	} catch (error) {
		return new Response(/** @type {Error} */ (error).message);
	}

	return new Response('no error');
}
