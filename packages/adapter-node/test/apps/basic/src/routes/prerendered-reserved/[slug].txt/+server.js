export const prerender = true;

export function GET({ params }) {
	return new Response(params.slug);
}
