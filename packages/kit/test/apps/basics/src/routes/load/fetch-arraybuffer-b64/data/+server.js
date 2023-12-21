export const GET = () => {
	return new Response(new Uint8Array([1, 2, 3, 4]));
};

export const POST = async ({ request }) => {
	return new Response(await request.arrayBuffer());
};
