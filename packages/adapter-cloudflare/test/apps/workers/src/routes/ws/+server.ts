export const GET = async ({ platform, request }) => {
	const stub = platform!.env.DO.getByName('stub');
	return stub.fetch(request.url, request);
}
