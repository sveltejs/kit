const adapters = [
	{
		test: () => !!process.env.VERCEL,
		module: () => import('@sveltejs/adapter-vercel')
	},
	{
		test: () => !!process.env.NETLIFY,
		module: () => import('@sveltejs/adapter-netlify')
	}
];

export default async function () {
	for (const candidate of adapters) {
		if (candidate.test()) {
			const module = await candidate.module();
			return await module();
		}
	}
}
