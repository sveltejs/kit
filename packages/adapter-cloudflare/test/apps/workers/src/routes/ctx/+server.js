export function GET({ platform }) {
	return new Response(platform?.ctx.waitUntil ? 'ctx works' : 'ctx does not work');
}
