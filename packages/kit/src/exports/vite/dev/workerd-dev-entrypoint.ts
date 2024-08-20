const handler = {
	fetch: (req: Request, env: any, ctx: any): Promise<Response> => {
		return new Promise((resolve) => resolve(new Response('Hello from workerd')));
	}
};

export default handler;
