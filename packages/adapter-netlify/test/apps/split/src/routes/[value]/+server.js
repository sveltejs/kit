export function GET({ params }) {
	return new Response(params.value);
}
