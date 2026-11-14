export async function GET() {
	try {
		await fetch('/runtime');
	} catch (error) {
		return new Response(/** @type {Error} */ (error).message);
	}

	return new Response('no error');
}
